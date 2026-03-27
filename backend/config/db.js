const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

// ---------------------------------------------------------------------------
// Sequelize instance with mysql2 connection pool
// ---------------------------------------------------------------------------
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    dialectOptions: {
      connectTimeout: 10000,
    },
    retry: {
      max: 3,
    },
  }
);

// ---------------------------------------------------------------------------
// Connect with retry & exponential back-off
// ---------------------------------------------------------------------------
const MAX_RETRIES = 5;
const BASE_DELAY_MS = 2000;

const connectDB = async () => {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await sequelize.authenticate();
      logger.info('MySQL connected successfully');
      return;
    } catch (error) {
      const isLast = attempt === MAX_RETRIES;
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);

      if (error.original) {
        const code = error.original.code || '';
        if (code === 'ER_ACCESS_DENIED_ERROR') {
          logger.error('MySQL access denied — check DB_USER / DB_PASSWORD in .env');
        } else if (code === 'ECONNREFUSED') {
          logger.error('MySQL connection refused — is the server running on the configured host/port?');
        } else {
          logger.error(`MySQL error [${code}]: ${error.original.message}`);
        }
      } else {
        logger.error(`MySQL connection error: ${error.message}`);
      }

      if (isLast) {
        logger.error(`All ${MAX_RETRIES} connection attempts failed — exiting`);
        process.exit(1);
      }

      logger.warn(`Retrying in ${delay / 1000}s (attempt ${attempt}/${MAX_RETRIES})…`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
};

// ---------------------------------------------------------------------------
// Graceful shutdown — close pool cleanly
// ---------------------------------------------------------------------------
const gracefulShutdown = async () => {
  try {
    await sequelize.close();
    logger.info('MySQL pool closed');
  } catch (error) {
    logger.error(`Error closing MySQL pool: ${error.message}`);
  }
};

module.exports = { sequelize, connectDB, gracefulShutdown };
