const { Game, Move } = require('../models/Game');
const User = require('../models/User');
const { sequelize } = require('../config/db');
const logger = require('../utils/logger');
const { checkWinner, generateRoomId } = require('../utils/helpers');

/** In-memory store for active game rooms. */
const rooms = new Map();

/** Get the rooms map (shared with matchmaking). */
const getRooms = () => rooms;

/** Reconnection grace period before auto-forfeit (ms). */
const DISCONNECT_GRACE_MS = 30_000;

/** Cleanup delay after a completed game (ms). */
const COMPLETED_CLEANUP_MS = 60_000;

/** Max room age for waiting rooms before auto-cleanup (ms). */
const WAITING_ROOM_MAX_AGE_MS = 5 * 60_000; // 5 minutes

// ---------------------------------------------------------------------------
// Database persistence
// ---------------------------------------------------------------------------

/**
 * Save a completed game to the database and update player stats.
 * Uses a transaction for atomicity — if any step fails, all roll back.
 */
const saveGameToDB = async (room) => {
  const transaction = await sequelize.transaction();
  try {
    const playerIds = room.players
      .map((p) => p.userId)
      .filter((id) => id !== null && id !== undefined);

    if (playerIds.length < 2) {
      await transaction.rollback();
      return;
    }

    const playerX = room.players.find((p) => p.symbol === 'X');
    const playerO = room.players.find((p) => p.symbol === 'O');

    const game = await Game.create({
      playerX_id: playerX?.userId || null,
      playerO_id: playerO?.userId || null,
      board: room.board,
      winner: room.result === 'draw' ? 'draw' : room.result,
      mode: 'online',
      status: 'completed',
      roomId: room.id,
    }, { transaction });

    await game.setPlayers(playerIds, { transaction });

    if (room.moves.length > 0) {
      const moveRecords = room.moves.map((m) => ({
        player: m.player,
        position: m.position,
        gameId: game.id,
      }));
      await Move.bulkCreate(moveRecords, { transaction });
    }

    // Update player stats atomically
    if (room.result && room.result !== 'draw') {
      const winnerPlayer = room.players.find((p) => p.symbol === room.result);
      const loserPlayer = room.players.find((p) => p.symbol !== room.result);
      if (winnerPlayer?.userId) {
        await User.increment('wins', { where: { id: winnerPlayer.userId }, transaction });
      }
      if (loserPlayer?.userId) {
        await User.increment('losses', { where: { id: loserPlayer.userId }, transaction });
      }
    } else if (room.result === 'draw') {
      for (const p of room.players) {
        if (p.userId) {
          await User.increment('draws', { where: { id: p.userId }, transaction });
        }
      }
    }

    await transaction.commit();
    logger.info(`Game saved: Room ${room.id}, Winner: ${room.result}`);
  } catch (error) {
    await transaction.rollback();
    logger.error('Error saving game to DB:', error.message);
  }
};

// ---------------------------------------------------------------------------
// Timer helpers — stored on room object so they can be cancelled
// ---------------------------------------------------------------------------

/**
 * Schedule cleanup/forfeit for an abandoned room.
 * Stores the timer handle on `room.cleanupTimer` so it can be cancelled on reconnection.
 * Uses a generation counter to detect stale timer callbacks (fix for clearTimeout race).
 */
const scheduleAbandonCleanup = (io, roomId, disconnectedUserId) => {
  const room = rooms.get(roomId);
  if (!room) return;

  // Cancel any existing timer
  if (room.cleanupTimer) {
    clearTimeout(room.cleanupTimer);
    room.cleanupTimer = null;
  }

  // Bump generation — any in-flight callback with a stale generation is ignored
  room._cleanupGeneration = (room._cleanupGeneration || 0) + 1;
  const generation = room._cleanupGeneration;

  room.cleanupTimer = setTimeout(() => {
    const currentRoom = rooms.get(roomId);
    if (!currentRoom || currentRoom.status !== 'abandoned') return;

    // Stale timer check — if generation doesn't match, a reconnect invalidated us
    if (currentRoom._cleanupGeneration !== generation) return;

    // Auto-forfeit: award win to the remaining (connected) player
    const remainingPlayer = currentRoom.players.find((p) => p.userId !== disconnectedUserId);
    if (remainingPlayer) {
      currentRoom.status = 'completed';
      currentRoom.result = remainingPlayer.symbol; // winner symbol

      // Notify remaining player
      io.to(roomId).emit('gameUpdate', {
        board: currentRoom.board,
        currentTurn: null,
        result: currentRoom.result,
        lastMove: null,
        forfeit: true,
        message: 'Opponent disconnected. You win!',
      });

      // Persist to DB
      saveGameToDB(currentRoom);
      logger.info(`Room ${roomId}: auto-forfeit → ${remainingPlayer.username} wins`);
    }

    // Schedule final cleanup
    scheduleCompletedCleanup(roomId);
  }, DISCONNECT_GRACE_MS);
};

/**
 * Schedule cleanup for completed game rooms.
 */
const scheduleCompletedCleanup = (roomId) => {
  setTimeout(() => {
    if (rooms.has(roomId)) {
      rooms.delete(roomId);
      logger.info(`Room ${roomId} cleaned up (completed)`);
    }
  }, COMPLETED_CLEANUP_MS);
};

// ---------------------------------------------------------------------------
// Socket event handlers for game rooms
// ---------------------------------------------------------------------------

/**
 * Create a new game room. Auth enforced at handshake level.
 */
const handleCreateRoom = (socket, _data, callback) => {
  // Belt-and-suspenders auth check
  if (!socket.userId) {
    return callback?.({ success: false, message: 'Authentication required. Please log in.' });
  }

  // Prevent being in multiple rooms simultaneously
  if (socket.roomId) {
    const existingRoom = rooms.get(socket.roomId);
    if (existingRoom && (existingRoom.status === 'waiting' || existingRoom.status === 'in_progress')) {
      return callback?.({ success: false, message: 'You are already in a room. Leave it first.' });
    }
  }

  const roomId = generateRoomId(new Set(rooms.keys()));

  const waitingTimer = setTimeout(() => {
    const room = rooms.get(roomId);
    if (room && room.status === 'waiting') {
      rooms.delete(roomId);
      logger.info(`Room ${roomId} cleaned up (waiting room timeout)`);
    }
  }, WAITING_ROOM_MAX_AGE_MS);

  rooms.set(roomId, {
    id: roomId,
    players: [{
      socketId: socket.id,
      userId: socket.userId,
      username: socket.username,
      symbol: 'X',
    }],
    board: Array(9).fill(null),
    moves: [],
    currentTurn: 'X',
    status: 'waiting',
    result: null,
    cleanupTimer: null,
    waitingTimer,
    createdAt: Date.now(),
    _cleanupGeneration: 0,
  });

  socket.join(roomId);
  socket.roomId = roomId;
  socket.playerSymbol = 'X';

  logger.info(`Room ${roomId} created by ${socket.username}`);
  callback?.({ success: true, roomId, symbol: 'X' });
};

/**
 * Join an existing game room. Auth enforced at handshake level.
 */
const handleJoinRoom = (io, socket, data, callback) => {
  // Validate payload
  if (!data || typeof data !== 'object') {
    return callback?.({ success: false, message: 'Invalid request data.' });
  }

  if (!socket.userId) {
    return callback?.({ success: false, message: 'Authentication required. Please log in.' });
  }

  // Prevent being in multiple rooms simultaneously
  if (socket.roomId) {
    const existingRoom = rooms.get(socket.roomId);
    if (existingRoom && (existingRoom.status === 'waiting' || existingRoom.status === 'in_progress')) {
      return callback?.({ success: false, message: 'You are already in a room. Leave it first.' });
    }
  }

  const { roomId } = data;

  if (!roomId || typeof roomId !== 'string') {
    return callback?.({ success: false, message: 'Room ID is required.' });
  }

  const room = rooms.get(roomId);

  if (!room) {
    return callback?.({ success: false, message: 'Room not found.' });
  }
  if (room.players.length >= 2) {
    return callback?.({ success: false, message: 'Room is full.' });
  }
  if (room.status !== 'waiting') {
    return callback?.({ success: false, message: 'Game already in progress.' });
  }
  if (room.players[0].userId === socket.userId) {
    return callback?.({ success: false, message: 'You cannot join your own room.' });
  }

  // Cancel waiting-room timeout since someone is joining
  if (room.waitingTimer) {
    clearTimeout(room.waitingTimer);
    room.waitingTimer = null;
  }

  room.players.push({
    socketId: socket.id,
    userId: socket.userId,
    username: socket.username,
    symbol: 'O',
  });
  room.status = 'in_progress';

  socket.join(roomId);
  socket.roomId = roomId;
  socket.playerSymbol = 'O';

  logger.info(`${socket.username} joined room: ${roomId}`);
  callback?.({ success: true, roomId, symbol: 'O' });

  // No socketId leak in emitted data
  io.to(roomId).emit('gameStart', {
    roomId,
    players: room.players.map((p) => ({
      symbol: p.symbol,
      username: p.username,
    })),
    board: room.board,
    currentTurn: room.currentTurn,
  });
};

/**
 * Process a player move — server-authoritative validation.
 */
const handlePlayerMove = (io, socket, data, callback) => {
  // Validate payload
  if (!data || typeof data !== 'object') {
    return callback?.({ success: false, message: 'Invalid request data.' });
  }

  // Auth check
  if (!socket.userId) {
    return callback?.({ success: false, message: 'Authentication required.' });
  }

  const { roomId, position } = data;

  if (!roomId || typeof roomId !== 'string') {
    return callback?.({ success: false, message: 'Room ID is required.' });
  }

  // Verify client-supplied roomId matches the socket's assigned room
  if (socket.roomId !== roomId) {
    return callback?.({ success: false, message: 'Room ID mismatch.' });
  }

  const room = rooms.get(roomId);

  if (!room) {
    return callback?.({ success: false, message: 'Room not found.' });
  }
  if (room.status !== 'in_progress') {
    return callback?.({ success: false, message: 'Game is not active.' });
  }

  // Find player by userId (not socketId) to survive reconnections
  const player = room.players.find((p) => p.userId === socket.userId);
  if (!player) {
    return callback?.({ success: false, message: 'You are not in this room.' });
  }
  if (player.symbol !== room.currentTurn) {
    return callback?.({ success: false, message: 'Not your turn.' });
  }

  // Use Number.isInteger to reject NaN, floats, and non-numbers
  if (!Number.isInteger(position) || position < 0 || position > 8 || room.board[position] !== null) {
    return callback?.({ success: false, message: 'Invalid move.' });
  }

  // Apply move
  room.board[position] = player.symbol;
  room.moves.push({ player: player.symbol, position, timestamp: new Date() });
  room.currentTurn = room.currentTurn === 'X' ? 'O' : 'X';

  const result = checkWinner(room.board);

  if (result) {
    room.status = 'completed';
    room.result = result;

    io.to(roomId).emit('gameUpdate', {
      board: room.board,
      currentTurn: null,
      result,
      lastMove: { player: player.symbol, position },
    });
    callback?.({ success: true });

    saveGameToDB(room);
    scheduleCompletedCleanup(roomId);
    return;
  }

  io.to(roomId).emit('gameUpdate', {
    board: room.board,
    currentTurn: room.currentTurn,
    result: null,
    lastMove: { player: player.symbol, position },
  });
  callback?.({ success: true });
};

/**
 * Reconnect to an existing room after page refresh.
 */
const handleReconnectToRoom = (socket, data, callback) => {
  // Validate payload
  if (!data || typeof data !== 'object') {
    return callback?.({ success: false, message: 'Invalid request data.' });
  }

  if (!socket.userId) {
    return callback?.({ success: false, message: 'Authentication required.' });
  }

  const { roomId } = data;

  if (!roomId || typeof roomId !== 'string') {
    return callback?.({ success: false, message: 'Room ID is required.' });
  }

  // Prevent reconnection if already in a different active room
  if (socket.roomId && socket.roomId !== roomId) {
    const otherRoom = rooms.get(socket.roomId);
    if (otherRoom && (otherRoom.status === 'waiting' || otherRoom.status === 'in_progress')) {
      return callback?.({ success: false, message: 'You are currently in another room.' });
    }
  }

  const room = rooms.get(roomId);
  if (!room) {
    return callback?.({ success: false, message: 'Room no longer exists.' });
  }

  const playerIndex = room.players.findIndex((p) => p.userId === socket.userId);
  if (playerIndex === -1) {
    return callback?.({ success: false, message: 'You were not in this room.' });
  }

  // Update socket ID for the reconnected player
  room.players[playerIndex].socketId = socket.id;

  // Cancel any pending abandon cleanup timer and invalidate in-flight callbacks
  if (room.cleanupTimer) {
    clearTimeout(room.cleanupTimer);
    room.cleanupTimer = null;
  }
  room._cleanupGeneration = (room._cleanupGeneration || 0) + 1; // invalidate stale timers

  // If room was abandoned, check if BOTH players are now connected before resuming
  if (room.status === 'abandoned' && room.players.length === 2) {
    const io = socket.server; // socket.server is the Socket.IO Server instance
    const bothConnected = room.players.every((p) => {
      const peerSocket = io?.sockets?.sockets?.get(p.socketId);
      return peerSocket && peerSocket.connected;
    });

    if (bothConnected) {
      room.status = 'in_progress';
      logger.info(`Room ${roomId} resumed — both players connected`);
    }
  }

  socket.join(roomId);
  socket.roomId = roomId;
  socket.playerSymbol = room.players[playerIndex].symbol;

  logger.info(`${socket.username} reconnected to room: ${roomId}`);

  // Full state on reconnect (includes full moves array for replay)
  callback?.({
    success: true,
    roomId,
    symbol: room.players[playerIndex].symbol,
    board: room.board,
    currentTurn: room.currentTurn,
    status: room.status,
    result: room.result,
    players: room.players.map((p) => ({
      symbol: p.symbol,
      username: p.username,
    })),
    moves: room.moves,
  });

  // Notify opponent
  socket.to(roomId).emit('opponentReconnected', {
    message: `${socket.username} has reconnected.`,
  });
};

/**
 * Handle disconnect — mark room as abandoned, schedule forfeit cleanup.
 * Handles the case where both players disconnect (no incorrect forfeit).
 */
const handleDisconnect = (io, socket) => {
  if (!socket.roomId) return;

  const room = rooms.get(socket.roomId);
  if (!room) return;

  if (room.status === 'in_progress') {
    room.status = 'abandoned';
    socket.to(socket.roomId).emit('opponentDisconnected', {
      message: 'Your opponent has disconnected. Waiting for reconnection…',
    });

    // Schedule forfeit with cancellable timer + generation counter
    scheduleAbandonCleanup(io, socket.roomId, socket.userId);
  } else if (room.status === 'abandoned') {
    // Both players disconnected — cancel any pending forfeit timer, just delete
    if (room.cleanupTimer) {
      clearTimeout(room.cleanupTimer);
      room.cleanupTimer = null;
    }
    rooms.delete(socket.roomId);
    logger.info(`Room ${socket.roomId} cleaned up (both players disconnected)`);
  } else if (room.status === 'waiting') {
    // Cancel waiting timer
    if (room.waitingTimer) {
      clearTimeout(room.waitingTimer);
      room.waitingTimer = null;
    }
    rooms.delete(socket.roomId);
    logger.info(`Room ${socket.roomId} cleaned up (empty)`);
  }
};

/**
 * Save all in-flight games on graceful shutdown.
 * Called by server.js before process.exit.
 */
const saveAllInFlightGames = async () => {
  const savePromises = [];
  for (const [roomId, room] of rooms) {
    if (room.status === 'in_progress' || room.status === 'abandoned') {
      room.status = 'completed';
      room.result = room.result || 'draw';
      savePromises.push(saveGameToDB(room));
      logger.info(`Saving in-flight game: Room ${roomId}`);
    }
  }
  if (savePromises.length > 0) {
    await Promise.allSettled(savePromises);
    logger.info(`Saved ${savePromises.length} in-flight game(s) before shutdown`);
  }
};

module.exports = {
  getRooms,
  handleCreateRoom,
  handleJoinRoom,
  handlePlayerMove,
  handleReconnectToRoom,
  handleDisconnect,
  saveAllInFlightGames,
};
