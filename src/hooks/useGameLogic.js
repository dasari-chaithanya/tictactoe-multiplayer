import { useState, useEffect, useCallback } from 'react';
import { calculateWinner, isBoardFull } from '../utils/helpers';
import { getBestMove } from '../utils/minimax';
import { useOnlineGame } from './useOnlineGame';

export const GAME_MODES = {
  PVP: 'pvp',
  PVAI: 'pvai',
  ONLINE: 'online'
};

export const DIFFICULTIES = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard'
};

/**
 * Custom hook to manage the entire Tic Tac Toe game state, including time travel, 
 * AI integration, online multiplayer, and score persistency.
 */
export const useGameLogic = () => {
  // --- STATE MANAGEMENT ---
  const [history, setHistory] = useState([Array(9).fill(null)]);
  const [currentMove, setCurrentMove] = useState(0);
  
  const [gameMode, setGameMode] = useState(GAME_MODES.PVP);
  const [difficulty, setDifficulty] = useState(DIFFICULTIES.HARD);
  
  // Persist scores to localStorage lazily during initialization
  const [scores, setScores] = useState(() => {
    const saved = localStorage.getItem('tictactoe-scores');
    return saved ? JSON.parse(saved) : { X: 0, O: 0, Draws: 0 };
  });
  
  const [aiIsThinking, setAiIsThinking] = useState(false);
  const aiSymbol = 'O';

  // Callback to refresh user data after online game (set by consumer)
  const [onGameComplete, setOnGameComplete] = useState(null);

  // --- ONLINE MULTIPLAYER ---
  const online = useOnlineGame();

  // --- DERIVED STATE ---
  const isOnline = gameMode === GAME_MODES.ONLINE;

  // For online mode, board comes from the server
  const xIsNext = isOnline ? (online.onlineTurn === 'X') : (currentMove % 2 === 0);
  const currentBoard = isOnline ? online.onlineBoard : history[currentMove];
  
  // Evaluate the currently viewed board
  const winnerInfo = calculateWinner(currentBoard);
  const isDraw = !winnerInfo && isBoardFull(currentBoard);
  const gameEnded = !!winnerInfo || isDraw;

  // For online: game result from server
  const onlineGameOver = isOnline && online.gameResult !== null;

  const isViewingPast = isOnline ? false : (currentMove !== history.length - 1);

  // Evaluate the global game state (the latest chronological move)
  const latestBoard = isOnline ? online.onlineBoard : history[history.length - 1];
  const latestWinnerInfo = calculateWinner(latestBoard);
  const latestIsDraw = !latestWinnerInfo && isBoardFull(latestBoard);
  const isGameOverGlobally = isOnline ? onlineGameOver : (!!latestWinnerInfo || latestIsDraw);

  // Is it this player's turn? (online only)
  const isMyTurn = isOnline && online.gameStarted && online.playerSymbol === online.onlineTurn;

  // --- MUTATORS ---

  /**
   * Processes a move intention on the grid.
   */
  const handleMove = useCallback((index, currentSymbol = xIsNext ? 'X' : 'O') => {
    // --- ONLINE MODE ---
    if (isOnline) {
      if (
        !online.gameStarted ||
        online.gameResult !== null ||
        online.opponentLeft ||
        online.playerSymbol !== online.onlineTurn ||
        online.onlineBoard[index] !== null
      ) {
        return;
      }
      online.sendMove(index);
      return;
    }

    // --- LOCAL MODES (PVP / AI) ---
    if (isGameOverGlobally && isViewingPast) return;

    if (
      currentBoard[index] || 
      winnerInfo || 
      (gameMode === GAME_MODES.PVAI && currentSymbol === aiSymbol && xIsNext) ||
      isGameOverGlobally
    ) {
      return;
    }

    const nextHistory = history.slice(0, currentMove + 1);
    const newBoard = [...currentBoard];
    newBoard[index] = currentSymbol;
    
    setHistory([...nextHistory, newBoard]);
    setCurrentMove(nextHistory.length);

    const newWinnerInfo = calculateWinner(newBoard);
    const newIsDraw = !newWinnerInfo && isBoardFull(newBoard);
    
    if (newWinnerInfo) {
      setScores(prev => ({ ...prev, [newWinnerInfo.winner]: prev[newWinnerInfo.winner] + 1 }));
    } else if (newIsDraw) {
      setScores(prev => ({ ...prev, Draws: prev.Draws + 1 }));
    }
  }, [currentBoard, history, currentMove, winnerInfo, gameMode, xIsNext, isGameOverGlobally, isViewingPast, aiSymbol, isOnline, online]);

  // --- EFFECTS ---

  useEffect(() => {
    localStorage.setItem('tictactoe-scores', JSON.stringify(scores));
  }, [scores]);

  useEffect(() => {
    if (gameMode === GAME_MODES.PVAI && !xIsNext && !gameEnded && !isViewingPast && !isGameOverGlobally) {
      setAiIsThinking(true);
      const timer = setTimeout(() => {
        const bestMoveIndex = getBestMove(currentBoard, aiSymbol, difficulty);
        if (bestMoveIndex !== -1) {
          handleMove(bestMoveIndex, aiSymbol);
        }
        setAiIsThinking(false);
      }, 500); 
      return () => clearTimeout(timer);
    }
  }, [xIsNext, gameMode, currentBoard, gameEnded, isViewingPast, isGameOverGlobally, handleMove, difficulty]);

  // Update local scores + refresh user stats when online game ends
  useEffect(() => {
    if (isOnline && online.gameResult) {
      if (online.gameResult === 'draw') {
        setScores(prev => ({ ...prev, Draws: prev.Draws + 1 }));
      } else {
        setScores(prev => ({ ...prev, [online.gameResult]: prev[online.gameResult] + 1 }));
      }
      // Refresh user data from DB (stats update after game save)
      if (onGameComplete) {
        setTimeout(() => onGameComplete(), 1500);
      }
    }
  }, [isOnline, online.gameResult, onGameComplete]);


  const jumpTo = (nextMove) => {
    setCurrentMove(nextMove);
  };

  const resetGame = () => {
    if (isOnline) {
      online.leaveRoom();
      return;
    }
    setHistory([Array(9).fill(null)]);
    setCurrentMove(0);
  };

  const resetScores = () => {
    setScores({ X: 0, O: 0, Draws: 0 });
  };

  /**
   * Switch game mode. Pass JWT token when entering online mode.
   * @param {string} mode
   * @param {string|null} token - JWT token for authenticated socket connection.
   */
  const changeMode = (mode, token = null) => {
    if (gameMode === GAME_MODES.ONLINE && mode !== GAME_MODES.ONLINE) {
      online.disconnect();
    }
    
    if (mode === GAME_MODES.ONLINE && gameMode !== GAME_MODES.ONLINE) {
      online.connect(token);
    }

    setGameMode(mode);
    setHistory([Array(9).fill(null)]);
    setCurrentMove(0);
  };

  return {
    board: currentBoard,
    history,
    currentMove,
    xIsNext,
    gameMode,
    difficulty,
    scores,
    winnerInfo,
    isDraw,
    gameEnded,
    aiIsThinking,
    isGameOverGlobally,
    isViewingPast,
    handleMove,
    jumpTo,
    resetGame,
    resetScores,
    changeMode,
    setDifficulty,
    setOnGameComplete,
    online,
    isMyTurn,
  };
};
