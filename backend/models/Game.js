const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * Game Model — stores completed and in-progress game sessions.
 * Has explicit playerX_id / playerO_id foreign keys.
 */
const Game = sequelize.define('Game', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  playerX_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'Users', key: 'id' },
  },
  playerO_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'Users', key: 'id' },
  },
  board: {
    type: DataTypes.JSON,
    defaultValue: [null, null, null, null, null, null, null, null, null],
  },
  winner: {
    type: DataTypes.ENUM('X', 'O', 'draw'),
    allowNull: true,
    defaultValue: null,
  },
  mode: {
    type: DataTypes.ENUM('local', 'ai', 'online'),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('in_progress', 'completed', 'abandoned'),
    defaultValue: 'in_progress',
  },
  roomId: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null,
  },
}, {
  timestamps: true,
});

/**
 * Move Model — individual moves made during a game.
 */
const Move = sequelize.define('Move', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  player: {
    type: DataTypes.ENUM('X', 'O'),
    allowNull: false,
  },
  position: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 0, max: 8 },
  },
}, {
  timestamps: true,
});

module.exports = { Game, Move };
