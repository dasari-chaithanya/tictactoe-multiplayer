const { socketAuthMiddleware } = require('../middleware/auth');
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

// ---------------------------------------------------------------------------
// Per-socket rate limiting (fixed-window, O(1) time & space)
// ---------------------------------------------------------------------------
const RATE_LIMIT_WINDOW_MS = 10_000; // 10 seconds
const RATE_LIMIT_MAX_EVENTS = 20;    // max events per window

/**
 * Returns true if the socket has exceeded the rate limit.
 * Uses a fixed-window counter — O(1) time and space.
 */
const isRateLimited = (socket) => {
  const now = Date.now();
  if (!socket._rateLimit) {
    socket._rateLimit = { count: 0, windowStart: now };
  }

  const rl = socket._rateLimit;

  // Reset window if expired
  if (now - rl.windowStart >= RATE_LIMIT_WINDOW_MS) {
    rl.count = 0;
    rl.windowStart = now;
  }

  rl.count++;
  return rl.count > RATE_LIMIT_MAX_EVENTS;
};

/**
 * Wraps a socket event handler with rate limiting and error catching.
 * Uses async/await to catch both sync and async errors.
 * @param {string} eventName — for logging
 * @param {Function} handler — (io, socket, data, callback) or subset
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 * @returns {Function} wrapped handler (data, callback)
 */
const guardedHandler = (eventName, handler, io, socket) => {
  return async (data, callback) => {
    try {
      // Rate limiting
      if (isRateLimited(socket)) {
        logger.warn(`Rate limited: ${socket.username} (${socket.id}) on '${eventName}'`);
        return callback?.({ success: false, message: 'Too many requests. Slow down.' });
      }

      // Call the actual handler — await catches both sync throws and async rejections
      await handler(io, socket, data, callback);
    } catch (err) {
      logger.error(`Unhandled error in '${eventName}' handler:`, err.message);
      callback?.({ success: false, message: 'Internal server error.' });
    }
  };
};

/**
 * Initializes all Socket.IO event handlers.
 * - Uses io.use() middleware to reject unauthenticated sockets at handshake.
 * - Wraps all handlers with rate limiting and error catching.
 * @param {import('socket.io').Server} io
 */
const initializeSocket = (io) => {
  // ---- Authentication gate — rejects before 'connection' fires ----
  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id} [${socket.username} (ID:${socket.userId})]`);

    // --- Room-based game events ---
    socket.on('createRoom', guardedHandler('createRoom', (_io, s, d, cb) => handleCreateRoom(s, d, cb), io, socket));
    socket.on('joinRoom', guardedHandler('joinRoom', handleJoinRoom, io, socket));
    socket.on('playerMove', guardedHandler('playerMove', handlePlayerMove, io, socket));
    socket.on('reconnectToRoom', guardedHandler('reconnectToRoom', (_io, s, d, cb) => handleReconnectToRoom(s, d, cb), io, socket));

    // --- Matchmaking events ---
    socket.on('findMatch', guardedHandler('findMatch', handleFindMatch, io, socket));
    socket.on('cancelMatch', guardedHandler('cancelMatch', (_io, s, d, cb) => handleCancelMatch(s, d, cb), io, socket));

    // --- Disconnect ---
    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id} [${socket.username}]`);
      removeFromQueue(socket);
      handleDisconnect(io, socket);
    });
  });
};

module.exports = { initializeSocket };
