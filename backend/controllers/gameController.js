const { Op } = require('sequelize');
const { Game, Move } = require('../models/Game');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * @route   POST /api/game/save
 * @desc    Save a completed game session and update player stats
 * @access  Private
 */
exports.saveGame = async (req, res) => {
  try {
    const { playerIds, moves, board, winner, mode } = req.body;

    if (!mode || !['local', 'ai', 'online'].includes(mode)) {
      return res.status(400).json({ success: false, message: 'Valid game mode is required.' });
    }

    const ids = playerIds && playerIds.length > 0 ? playerIds : [req.user.id];

    // Create the game record with explicit FK columns
    const game = await Game.create({
      playerX_id: ids[0] || null,
      playerO_id: ids[1] || null,
      board: board || Array(9).fill(null),
      winner,
      mode,
      status: 'completed',
    });

    // Also populate the join table for backward compat
    await game.setPlayers(ids.filter(Boolean));

    // Bulk-create moves if provided
    if (moves && moves.length > 0) {
      const moveRecords = moves.map((m) => ({
        player: m.player,
        position: m.position,
        gameId: game.id,
      }));
      await Move.bulkCreate(moveRecords);
    }

    // Update player statistics for two-player games
    if (winner && winner !== 'draw' && ids.length === 2) {
      const winnerIndex = winner === 'X' ? 0 : 1;
      const loserIndex = winner === 'X' ? 1 : 0;
      await User.increment('wins', { where: { id: ids[winnerIndex] } });
      await User.increment('losses', { where: { id: ids[loserIndex] } });
    } else if (winner === 'draw' && ids.length === 2) {
      await User.increment('draws', { where: { id: ids } });
    }

    res.status(201).json({ success: true, data: game });
  } catch (error) {
    logger.error('Save game error:', error.message);
    res.status(500).json({ success: false, message: 'Server error saving game.' });
  }
};

/**
 * @route   GET /api/game/history
 * @desc    Get paginated game history for the authenticated user
 * @access  Private
 */
exports.getHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = (page - 1) * limit;
    const userId = req.user.id;

    const { count, rows: games } = await Game.findAndCountAll({
      where: {
        [Op.or]: [{ playerX_id: userId }, { playerO_id: userId }],
      },
      include: [
        { model: User, as: 'playerX', attributes: ['id', 'username'] },
        { model: User, as: 'playerO', attributes: ['id', 'username'] },
        { model: Move, as: 'moves' },
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      distinct: true,
    });

    res.status(200).json({
      success: true,
      data: games,
      pagination: { page, limit, total: count, pages: Math.ceil(count / limit) },
    });
  } catch (error) {
    logger.error('Get history error:', error.message);
    res.status(500).json({ success: false, message: 'Server error fetching history.' });
  }
};

/**
 * @route   GET /api/game/:id
 * @desc    Get a single game by ID
 * @access  Private
 */
exports.getGameById = async (req, res) => {
  try {
    const game = await Game.findByPk(req.params.id, {
      include: [
        { model: User, as: 'playerX', attributes: ['id', 'username'] },
        { model: User, as: 'playerO', attributes: ['id', 'username'] },
        { model: Move, as: 'moves', order: [['createdAt', 'ASC']] },
      ],
    });

    if (!game) {
      return res.status(404).json({ success: false, message: 'Game not found.' });
    }

    res.status(200).json({ success: true, data: game });
  } catch (error) {
    logger.error('Get game error:', error.message);
    res.status(500).json({ success: false, message: 'Server error fetching game.' });
  }
};
