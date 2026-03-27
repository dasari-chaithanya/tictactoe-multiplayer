require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { sequelize, connectDB, gracefulShutdown } = require('./config/db');
const { initializeSocket } = require('./socket/socketHandler');
const logger = require('./utils/logger');

// Import models with associations (MUST be imported before sync)
require('./models/index');

const authRoutes = require('./routes/authRoutes');
const gameRoutes = require('./routes/gameRoutes');

// ---------------------------------------------------------------------------
// CORS origin helper — supports comma-separated CLIENT_URL for multi-origin
// e.g. CLIENT_URL=https://app.example.com,https://preview.example.com
// ---------------------------------------------------------------------------
const parseOrigins = () => {
  const raw = process.env.CLIENT_URL || 'https://tictactoe-multiplayer-75ud.onrender.com/';
  const origins = raw.split(',').map((o) => o.trim()).filter(Boolean);
  return origins.length === 1 ? origins[0] : origins;
};

const allowedOrigins = parseOrigins();

// ---------------------------------------------------------------------------
// Express app & HTTP server
// ---------------------------------------------------------------------------
const app = express();
const server = http.createServer(app);

// Trust proxy — required on Render (and most PaaS) for correct req.ip
app.set('trust proxy', 1);

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------------------------------------
// API Routes
// ---------------------------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// Global error handler
app.use((err, _req, res, _next) => {
  logger.error('Unhandled error:', err.stack || err.message);
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

// ---------------------------------------------------------------------------
// Socket.IO
// ---------------------------------------------------------------------------
initializeSocket(io);

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  // sync() creates tables if they don't exist but does NOT alter existing ones.
  // For schema changes in production, use Sequelize migrations instead of alter:true.
  await sequelize.sync();
  logger.info('Database tables synced');

  server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Socket.IO ready for connections`);
    logger.info(`Allowed origins: ${Array.isArray(allowedOrigins) ? allowedOrigins.join(', ') : allowedOrigins}`);
  });
};

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------
const shutdown = async (signal) => {
  logger.info(`${signal} received — shutting down gracefully`);

  // Save all in-flight games before closing
  const { saveAllInFlightGames } = require('./socket/gameHandler');
  await saveAllInFlightGames();

  // Stop accepting new connections
  server.close(() => {
    logger.info('HTTP server closed');
  });

  // Close Socket.IO
  io.close(() => {
    logger.info('Socket.IO server closed');
  });

  // Close DB pool
  await gracefulShutdown();

  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Safety nets — prevent crashes from unhandled errors
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error.message);
  // Exit after logging — the process manager should restart
  process.exit(1);
});

startServer();
