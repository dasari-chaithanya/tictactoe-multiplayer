const { Game, Move } = require('../models/Game');
const User = require('../models/User');
const logger = require('../utils/logger');
const { checkWinner, generateRoomId } = require('../utils/helpers');

/** In-memory store for active game rooms. */
const rooms = new Map();

/** Get the rooms map (shared with matchmaking). */
const getRooms = () => rooms;

// ---------------------------------------------------------------------------
// Database persistence
// ---------------------------------------------------------------------------

/**
 * Save a completed game to the database and update player stats.
 */
const saveGameToDB = async (room) => {
  try {
    const playerIds = room.players
      .map((p) => p.userId)
      .filter((id) => id !== null);

    if (playerIds.length < 2) return;

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
    });

    await game.setPlayers(playerIds);

    if (room.moves.length > 0) {
      const moveRecords = room.moves.map((m) => ({
        player: m.player,
        position: m.position,
        gameId: game.id,
      }));
      await Move.bulkCreate(moveRecords);
    }

    // Update player stats
    if (room.result && room.result !== 'draw') {
      const winnerPlayer = room.players.find((p) => p.symbol === room.result);
      const loserPlayer = room.players.find((p) => p.symbol !== room.result);
      if (winnerPlayer?.userId) {
        await User.increment('wins', { where: { id: winnerPlayer.userId } });
      }
      if (loserPlayer?.userId) {
        await User.increment('losses', { where: { id: loserPlayer.userId } });
      }
    } else if (room.result === 'draw') {
      for (const p of room.players) {
        if (p.userId) {
          await User.increment('draws', { where: { id: p.userId } });
        }
      }
    }

    logger.info(`Game saved: Room ${room.id}, Winner: ${room.result}`);
  } catch (error) {
    logger.error('Error saving game to DB:', error.message);
  }
};

// ---------------------------------------------------------------------------
// Socket event handlers for game rooms
// ---------------------------------------------------------------------------

/**
 * Create a new game room. Requires authentication.
 */
const handleCreateRoom = (socket, _data, callback) => {
  if (!socket.userId) {
    return callback?.({ success: false, message: 'Authentication required. Please log in.' });
  }

  const roomId = generateRoomId();

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
  });

  socket.join(roomId);
  socket.roomId = roomId;
  socket.playerSymbol = 'X';

  logger.info(`Room ${roomId} created by ${socket.username}`);
  callback?.({ success: true, roomId, symbol: 'X' });
};

/**
 * Join an existing game room. Requires authentication.
 */
const handleJoinRoom = (io, socket, data, callback) => {
  if (!socket.userId) {
    return callback?.({ success: false, message: 'Authentication required. Please log in.' });
  }

  const { roomId } = data;
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

  io.to(roomId).emit('gameStart', {
    roomId,
    players: room.players.map((p) => ({
      symbol: p.symbol,
      username: p.username,
      socketId: p.socketId,
    })),
    board: room.board,
    currentTurn: room.currentTurn,
  });
};

/**
 * Process a player move — server-authoritative validation.
 */
const handlePlayerMove = (io, socket, data, callback) => {
  const { roomId, position } = data;
  const room = rooms.get(roomId);

  if (!room) {
    return callback?.({ success: false, message: 'Room not found.' });
  }
  if (room.status !== 'in_progress') {
    return callback?.({ success: false, message: 'Game is not active.' });
  }

  const player = room.players.find((p) => p.socketId === socket.id);
  if (!player) {
    return callback?.({ success: false, message: 'You are not in this room.' });
  }
  if (player.symbol !== room.currentTurn) {
    return callback?.({ success: false, message: 'Not your turn.' });
  }
  if (typeof position !== 'number' || position < 0 || position > 8 || room.board[position] !== null) {
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
      moves: room.moves,
    });
    callback?.({ success: true });

    saveGameToDB(room);

    // Cleanup after 60s
    setTimeout(() => rooms.delete(roomId), 60000);
    return;
  }

  io.to(roomId).emit('gameUpdate', {
    board: room.board,
    currentTurn: room.currentTurn,
    result: null,
    moves: room.moves,
  });
  callback?.({ success: true });
};

/**
 * Reconnect to an existing room after page refresh.
 */
const handleReconnectToRoom = (socket, data, callback) => {
  const { roomId } = data;

  if (!socket.userId) {
    return callback?.({ success: false, message: 'Authentication required.' });
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

  // If room was abandoned due to this player disconnecting, resume it
  if (room.status === 'abandoned' && room.players.length === 2) {
    room.status = 'in_progress';
  }

  socket.join(roomId);
  socket.roomId = roomId;
  socket.playerSymbol = room.players[playerIndex].symbol;

  logger.info(`${socket.username} reconnected to room: ${roomId}`);

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
      socketId: p.socketId,
    })),
  });

  // Notify opponent
  socket.to(roomId).emit('opponentReconnected', {
    message: `${socket.username} has reconnected.`,
  });
};

/**
 * Handle disconnect — mark room as abandoned, schedule cleanup.
 */
const handleDisconnect = (socket) => {
  if (!socket.roomId) return;

  const room = rooms.get(socket.roomId);
  if (!room) return;

  if (room.status === 'in_progress') {
    room.status = 'abandoned';
    socket.to(socket.roomId).emit('opponentDisconnected', {
      message: 'Your opponent has disconnected.',
    });
    // Grace period for reconnection
    const roomIdCopy = socket.roomId;
    setTimeout(() => {
      const currentRoom = rooms.get(roomIdCopy);
      if (currentRoom && currentRoom.status === 'abandoned') {
        rooms.delete(roomIdCopy);
        logger.info(`Room ${roomIdCopy} cleaned up (abandoned)`);
      }
    }, 30000);
  } else if (room.status === 'waiting') {
    rooms.delete(socket.roomId);
    logger.info(`Room ${socket.roomId} cleaned up (empty)`);
  }
};

module.exports = {
  getRooms,
  handleCreateRoom,
  handleJoinRoom,
  handlePlayerMove,
  handleReconnectToRoom,
  handleDisconnect,
};
