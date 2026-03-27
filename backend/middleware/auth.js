const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Express middleware — verifies Bearer token and attaches user to req.
 */
const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] },
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'User associated with this token no longer exists.' });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Not authorized. Token is invalid or expired.' });
  }
};

/**
 * Socket.IO authentication middleware.
 * Use with io.use() to reject unauthenticated connections at the handshake.
 * Attaches userId & username to the socket object on success.
 */
const socketAuthMiddleware = async (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    logger.warn(`Socket auth rejected: no token (${socket.id})`);
    return next(new Error('Authentication required. Please log in.'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id, {
      attributes: ['id', 'username'],
    });

    if (!user) {
      logger.warn(`Socket auth rejected: user not found (${socket.id})`);
      return next(new Error('User not found. Token may be invalid.'));
    }

    socket.userId = user.id;
    socket.username = user.username;
    next();
  } catch (err) {
    logger.warn(`Socket auth rejected: invalid token (${socket.id}) — ${err.message}`);
    return next(new Error('Authentication failed. Token is invalid or expired.'));
  }
};

module.exports = { protect, socketAuthMiddleware };
