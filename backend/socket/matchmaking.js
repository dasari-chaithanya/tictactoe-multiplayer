const logger = require('../utils/logger');
const { generateRoomId } = require('../utils/helpers');
const { getRooms } = require('./gameHandler');

/**
 * Queue-based matchmaking system.
 * Players call `findMatch` to join the queue; when two players are queued
 * they are automatically paired into a new room.
 */

/** Matchmaking queue — array of { socketId, userId, username } */
const queue = [];

/**
 * Add a player to the matchmaking queue.
 * If another player is already waiting, pair them immediately.
 * Drains stale (disconnected) entries from the front of the queue.
 */
const handleFindMatch = (io, socket, _data, callback) => {
  // Auth is enforced at handshake, but belt-and-suspenders
  if (!socket.userId) {
    return callback?.({ success: false, message: 'Authentication required. Please log in.' });
  }

  // Prevent duplicate entries
  const alreadyQueued = queue.find((q) => q.userId === socket.userId);
  if (alreadyQueued) {
    return callback?.({ success: false, message: 'You are already in the matchmaking queue.' });
  }

  // Prevent joining queue while already in an active game
  if (socket.roomId) {
    const rooms = getRooms();
    const existingRoom = rooms.get(socket.roomId);
    if (existingRoom && existingRoom.status === 'in_progress') {
      return callback?.({ success: false, message: 'You are already in an active game.' });
    }
  }

  // Try to find a valid opponent by draining stale entries
  while (queue.length > 0) {
    const opponent = queue.shift();

    // Skip if opponent is the same user (shouldn't happen, but guard)
    if (opponent.userId === socket.userId) continue;

    // Verify opponent socket is still connected
    const opponentSocket = io.sockets.sockets.get(opponent.socketId);
    if (!opponentSocket || !opponentSocket.connected) {
      logger.info(`Removed stale entry from queue: userId=${opponent.userId}`);
      continue; // Try the next entry
    }

    // Found a valid opponent — create the room
    const rooms = getRooms();
    const roomId = generateRoomId(new Set(rooms.keys()));

    rooms.set(roomId, {
      id: roomId,
      players: [
        { socketId: opponent.socketId, userId: opponent.userId, username: opponent.username, symbol: 'X' },
        { socketId: socket.id, userId: socket.userId, username: socket.username, symbol: 'O' },
      ],
      board: Array(9).fill(null),
      moves: [],
      currentTurn: 'X',
      status: 'in_progress',
      result: null,
      cleanupTimer: null,
    });

    // Join both sockets to the room
    opponentSocket.join(roomId);
    opponentSocket.roomId = roomId;
    opponentSocket.playerSymbol = 'X';

    socket.join(roomId);
    socket.roomId = roomId;
    socket.playerSymbol = 'O';

    logger.info(`Matchmaking: ${opponent.username} (X) vs ${socket.username} (O) → Room ${roomId}`);

    // Notify the opponent who was waiting
    opponentSocket.emit('matchFound', { roomId, symbol: 'X' });

    // Notify current player
    callback?.({ success: true, matched: true, roomId, symbol: 'O' });

    // Emit gameStart to the entire room (no socketId leak)
    io.to(roomId).emit('gameStart', {
      roomId,
      players: [
        { symbol: 'X', username: opponent.username },
        { symbol: 'O', username: socket.username },
      ],
      board: Array(9).fill(null),
      currentTurn: 'X',
    });

    return; // Matched — done
  }

  // No valid opponent found — add to queue
  queue.push({ socketId: socket.id, userId: socket.userId, username: socket.username });
  logger.info(`${socket.username} added to matchmaking queue (queue size: ${queue.length})`);
  callback?.({ success: true, message: 'Searching for opponent…' });
};

/**
 * Remove a player from the matchmaking queue.
 */
const handleCancelMatch = (_io, socket, _data, callback) => {
  const index = queue.findIndex((q) => q.userId === socket.userId);
  if (index !== -1) {
    queue.splice(index, 1);
    logger.info(`${socket.username} removed from matchmaking queue`);
  }
  callback?.({ success: true });
};

/**
 * Remove a disconnected player from the queue (called on disconnect).
 */
const removeFromQueue = (socket) => {
  const index = queue.findIndex((q) => q.socketId === socket.id);
  if (index !== -1) {
    queue.splice(index, 1);
    logger.info(`${socket.username || 'Player'} removed from queue on disconnect`);
  }
};

module.exports = { handleFindMatch, handleCancelMatch, removeFromQueue };
