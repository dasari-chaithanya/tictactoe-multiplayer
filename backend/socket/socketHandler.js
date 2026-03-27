const { authenticateSocket } = require('../middleware/auth');
const logger = require('../utils/logger');
const {
  handleCreateRoom,
  handleJoinRoom,
  handlePlayerMove,
  handleReconnectToRoom,
  handleDisconnect,
} = require('./gameHandler');
const {
  handleFindMatch,
  handleCancelMatch,
  removeFromQueue,
} = require('./matchmaking');

/**
 * Initializes all Socket.IO event handlers.
 * Delegates to gameHandler and matchmaking modules.
 * @param {import('socket.io').Server} io
 */
const initializeSocket = (io) => {
  io.on('connection', async (socket) => {
    // Authenticate on connection
    await authenticateSocket(socket);

    const authLabel = socket.userId
      ? `${socket.username} (ID:${socket.userId})`
      : 'Guest';
    logger.info(`Socket connected: ${socket.id} [${authLabel}]`);

    // --- Room-based game events ---
    socket.on('createRoom', (data, cb) => handleCreateRoom(socket, data, cb));
    socket.on('joinRoom', (data, cb) => handleJoinRoom(io, socket, data, cb));
    socket.on('playerMove', (data, cb) => handlePlayerMove(io, socket, data, cb));
    socket.on('reconnectToRoom', (data, cb) => handleReconnectToRoom(socket, data, cb));

    // --- Matchmaking events ---
    socket.on('findMatch', (data, cb) => handleFindMatch(io, socket, data, cb));
    socket.on('cancelMatch', (data, cb) => handleCancelMatch(socket, data, cb));

    // --- Disconnect ---
    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id} [${authLabel}]`);
      removeFromQueue(socket);
      handleDisconnect(socket);
    });
  });
};

module.exports = { initializeSocket };
