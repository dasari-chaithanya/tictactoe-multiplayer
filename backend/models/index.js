const User = require('./User');
const { Game, Move } = require('./Game');

// ---------------------------------------------------------------------------
// Associations
// ---------------------------------------------------------------------------

// Explicit FK associations for playerX and playerO
Game.belongsTo(User, { as: 'playerX', foreignKey: 'playerX_id' });
Game.belongsTo(User, { as: 'playerO', foreignKey: 'playerO_id' });
User.hasMany(Game, { as: 'gamesAsX', foreignKey: 'playerX_id' });
User.hasMany(Game, { as: 'gamesAsO', foreignKey: 'playerO_id' });

// Many-to-many (kept for backward compat with existing data)
Game.belongsToMany(User, { through: 'GamePlayers', as: 'players' });
User.belongsToMany(Game, { through: 'GamePlayers', as: 'games' });

// Game ↔ Move (one-to-many)
Game.hasMany(Move, { as: 'moves', foreignKey: 'gameId', onDelete: 'CASCADE' });
Move.belongsTo(Game, { foreignKey: 'gameId' });

module.exports = { User, Game, Move };
