import { calculateWinner, isBoardFull } from './helpers';

/**
 * Pure implementation of the Minimax decision rule algorithm.
 * Evaluates the entire game tree from the given board state to determine the optimal mathematical outcome.
 * Includes depth awareness to prefer faster wins and prolong inevitable losses.
 * 
 * @param {Array<string|null>} board - Current snapshot of the 1D game grid
 * @param {number} depth - Recursive depth tracker for score scaling
 * @param {boolean} isMaximizing - True if current recursive turn belongs to the AI
 * @param {string} aiSymbol - The token representing the AI ('O' or 'X')
 * @param {string} humanSymbol - The token representing the human player
 * 
 * @returns {number} The evaluated numeric score for this branch
 */
export const minimax = (board, depth, isMaximizing, aiSymbol, humanSymbol) => {
  const winnerInfo = calculateWinner(board);
  
  // Terminal Evaluation states 
  // We subtract `depth` from a winning score so the algorithm chooses the shortest path to victory.
  // We add `depth` to a losing score so the algorithm chooses the longest path to defeat.
  if (winnerInfo?.winner === aiSymbol) return 10 - depth;
  if (winnerInfo?.winner === humanSymbol) return -10 + depth;
  if (isBoardFull(board)) return 0;

  if (isMaximizing) {
    let bestScore = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        // Deep copy enforces immutability to prevent bleeding state across recursive branches
        const newBoard = [...board];
        newBoard[i] = aiSymbol;
        
        // Recursively call for the Opponent's minimizing turn
        const score = minimax(newBoard, depth + 1, false, aiSymbol, humanSymbol);
        bestScore = Math.max(score, bestScore);
      }
    }
    return bestScore;
  } else {
    let bestScore = Infinity;
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        const newBoard = [...board];
        newBoard[i] = humanSymbol;
        
        // Recursively call for the AI's maximizing turn
        const score = minimax(newBoard, depth + 1, true, aiSymbol, humanSymbol);
        bestScore = Math.min(score, bestScore);
      }
    }
    return bestScore;
  }
};

/**
 * Coordinates the Minimax algorithm applying selectable difficulty constraints.
 * 
 * @param {Array<string|null>} board - The current actual state of the board
 * @param {string} aiSymbol - The token ('X' or 'O') representing the AI engine
 * @param {string} difficulty - Operational string ('easy', 'medium', 'hard') denoting heuristic strength
 * 
 * @returns {number} The chosen optimal or heuristic array index for the AI to play
 */
export const getBestMove = (board, aiSymbol, difficulty = 'hard') => {
  const humanSymbol = aiSymbol === 'X' ? 'O' : 'X';
  const availableSpots = [];
  
  // Extract unplayed positions universally
  for (let i = 0; i < 9; i++) {
    if (!board[i]) availableSpots.push(i);
  }

  if (availableSpots.length === 0) return -1;
  
  // Initial center/corner optimization for performance on first move (skips ~255K recursive evaluations)
  if (availableSpots.length === 9) {
    const firstMoves = [0, 2, 4, 6, 8];
    return firstMoves[Math.floor(Math.random() * firstMoves.length)];
  }

  // Early returns mapping directly to configured application heuristics
  if (difficulty === 'easy') {
    return availableSpots[Math.floor(Math.random() * availableSpots.length)];
  }

  if (difficulty === 'medium') {
    // 50% chance of a completely optimal move, 50% random fallback
    if (Math.random() < 0.5) {
      return availableSpots[Math.floor(Math.random() * availableSpots.length)];
    }
  }

  // 'Hard' mode: Evaluate complete search tree optimally
  let bestScore = -Infinity;
  let bestMove = -1;

  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      const newBoard = [...board];
      newBoard[i] = aiSymbol;
      
      const score = minimax(newBoard, 0, false, aiSymbol, humanSymbol);
      if (score > bestScore) {
        bestScore = score;
        bestMove = i;
      }
    }
  }
  
  return bestMove;
};
