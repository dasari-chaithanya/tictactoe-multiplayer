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
 * @returns {string}
 */
const generateRoomId = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

module.exports = { checkWinner, generateRoomId, WINNING_COMBINATIONS };
