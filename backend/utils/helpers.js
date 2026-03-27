const crypto = require('crypto');

/**
 * Shared helper utilities used across the backend.
 */

// Winning lines on a 3×3 board
const WINNING_COMBINATIONS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],            // diagonals
];

/**
 * Check if there is a winner or draw on the board.
 * @param {Array} board — 9-element array (null | 'X' | 'O')
 * @returns {'X' | 'O' | 'draw' | null}
 */
const checkWinner = (board) => {
  for (const [a, b, c] of WINNING_COMBINATIONS) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  if (board.every((cell) => cell !== null)) return 'draw';
  return null;
};

/**
 * Generate a 6-character room ID (no ambiguous chars).
 * Optionally accepts a Set of existing IDs to guarantee uniqueness.
 * @param {Set<string>} [existingIds] — set of IDs currently in use
 * @returns {string}
 */
const generateRoomId = (existingIds) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const MAX_ATTEMPTS = 100;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // If no existing set provided, or the ID is unique, return it
    if (!existingIds || !existingIds.has(result)) {
      return result;
    }
  }

  // Fallback: use crypto for unpredictable uniqueness
  const fallback = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
  return fallback;
};

module.exports = { checkWinner, generateRoomId, WINNING_COMBINATIONS };
