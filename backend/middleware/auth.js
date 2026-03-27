const jwt = require('jsonwebtoken');
const User = require('../models/User');

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
 * Socket.IO authentication helper.
 * Reads JWT from socket.handshake.auth.token,
 * attaches userId & username to the socket object.
 */
const authenticateSocket = async (socket) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    socket.userId = null;
    socket.username = 'Guest';
    return;
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id, {
      attributes: ['id', 'username'],
    });
    if (user) {
      socket.userId = user.id;
      socket.username = user.username;
    } else {
      socket.userId = null;
      socket.username = 'Guest';
    }
  } catch {
    socket.userId = null;
    socket.username = 'Guest';
  }
};

module.exports = { protect, authenticateSocket };
