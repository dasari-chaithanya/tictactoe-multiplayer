/**
 * Lightweight structured logger.
 * Replaces scattered console.log/error calls with tagged, timestamped output.
 */

const TAG = {
  INFO:  '\x1b[36m[INFO]\x1b[0m',
  WARN:  '\x1b[33m[WARN]\x1b[0m',
  ERROR: '\x1b[31m[ERROR]\x1b[0m',
};

const timestamp = () => new Date().toISOString();

const logger = {
  info:  (...args) => console.log(TAG.INFO,  timestamp(), ...args),
  warn:  (...args) => console.warn(TAG.WARN,  timestamp(), ...args),
  error: (...args) => console.error(TAG.ERROR, timestamp(), ...args),
};

module.exports = logger;
