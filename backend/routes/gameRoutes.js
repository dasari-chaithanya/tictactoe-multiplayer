const express = require('express');
const { saveGame, getHistory, getGameById } = require('../controllers/gameController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All game routes are protected
router.use(protect);

// @route  POST /api/game/save
router.post('/save', saveGame);

// @route  GET /api/game/history
router.get('/history', getHistory);

// @route  GET /api/game/:id
router.get('/:id', getGameById);

module.exports = router;
