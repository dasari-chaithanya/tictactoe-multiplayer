import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameLogic, GAME_MODES } from '../hooks/useGameLogic';
import { useAuth } from '../context/AuthContext';
import Board from '../components/Board';
import ScoreBoard from '../components/ScoreBoard';
import GameControls from '../components/GameControls';
import ModeSelector from '../components/ModeSelector';
import DifficultySelector from '../components/DifficultySelector';
import MoveHistory from '../components/MoveHistory';
import ThemeToggle from '../components/ThemeToggle';
import OnlineLobby from '../components/OnlineLobby';
import UserStats from '../components/UserStats';
import AuthPage from './AuthPage';
import confetti from 'canvas-confetti';
import { LogOut, User } from 'lucide-react';

const Game = () => {
  const { user, token, isAuthenticated, logout, refreshUser } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  const {
    board,
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
    isMyTurn
  } = useGameLogic();

  const isOnline = gameMode === GAME_MODES.ONLINE;

  // Set the game-complete callback to refresh user stats from DB
  useEffect(() => {
    setOnGameComplete(() => refreshUser);
  }, [setOnGameComplete, refreshUser]);

  useEffect(() => {
    if (winnerInfo) {
      const colors = winnerInfo.winner === 'X' ? ['#6366f1', '#818cf8'] : ['#d946ef', '#e879f9'];
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: colors,
        disableForReducedMotion: true
      });
    }
  }, [winnerInfo]);

  // Online game ends with a winner — confetti for online
  useEffect(() => {
    if (isOnline && online.gameResult && online.gameResult !== 'draw') {
      const colors = online.gameResult === 'X' ? ['#6366f1', '#818cf8'] : ['#d946ef', '#e879f9'];
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: colors,
        disableForReducedMotion: true
      });
    }
  }, [isOnline, online.gameResult]);

  /**
   * Handle mode change — gate online mode behind auth.
   */
  const handleModeChange = (mode) => {
    if (mode === GAME_MODES.ONLINE && !isAuthenticated) {
      setShowAuth(true);
      return;
    }
    changeMode(mode, token);
  };

  const getStatusMessage = () => {
    if (isOnline) {
      if (online.opponentLeft) return 'Opponent Disconnected 👋';
      if (online.gameResult) {
        if (online.gameResult === 'draw') return "It's a Draw! 🤝";
        if (online.gameResult === online.playerSymbol) return 'You Win! 🎉';
        return 'You Lose 😔';
      }
      if (online.gameStarted) {
        if (isMyTurn) return `Your Turn (${online.playerSymbol}) 🎯`;
        return `Opponent's Turn ⏳`;
      }
      if (online.isWaiting) return 'Waiting for Opponent… ⏳';
      return 'Join or Create a Room 🌐';
    }

    if (isGameOverGlobally && isViewingPast) return `Viewing Move #${currentMove} 🕰️`;
    if (winnerInfo) return `Player ${winnerInfo.winner} Wins! 🎉`;
    if (isDraw) return `It's a Draw! 🤝`;
    if (aiIsThinking) return `AI is thinking... 🤔`;
    return `Player ${xIsNext ? 'X' : 'O'}'s Turn`;
  };

  const getStatusColor = () => {
    if (isOnline) {
      if (online.gameResult === online.playerSymbol) return 'text-emerald-500';
      if (online.gameResult && online.gameResult !== 'draw') return 'text-red-400';
      if (online.gameResult === 'draw' || online.opponentLeft) return 'text-foreground';
      if (online.gameStarted && isMyTurn) return online.playerSymbol === 'X' ? 'text-primary' : 'text-secondary';
      if (online.gameStarted && !isMyTurn) return 'text-slate-400';
      return 'text-foreground';
    }

    if (winnerInfo?.winner === 'X') return 'text-primary';
    if (winnerInfo?.winner === 'O') return 'text-secondary';
    if (isDraw) return 'text-foreground';
    return xIsNext ? 'text-primary' : 'text-secondary';
  };

  const showBoard = !isOnline || online.gameStarted;
  const showLobby = isOnline && !online.gameStarted;
  const boardDisabled = isOnline 
    ? (!isMyTurn || !!online.gameResult || online.opponentLeft)
    : (gameEnded || aiIsThinking);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="min-h-[100dvh] w-full flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden transition-colors duration-500 premium-gradient-bg"
    >
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/20 sm:bg-primary/10 rounded-full blur-[100px] sm:blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-secondary/20 sm:bg-secondary/10 rounded-full blur-[100px] sm:blur-[140px] pointer-events-none" />
      
      <div className="w-full max-w-[500px] relative z-10 flex flex-col items-center">
        {/* Header Row */}
        <header className="w-full flex justify-between items-center mb-4 sm:mb-6 max-w-[400px]">
          <h1 className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent drop-shadow-md">
            Tic Tac Toe
          </h1>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>

        {/* User Bar (when authenticated) */}
        <AnimatePresence>
          {isAuthenticated && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full max-w-[400px] mb-4 flex items-center justify-between px-4 py-2.5 rounded-xl floating-card border border-white/15 dark:border-white/5"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm font-bold text-foreground">{user?.username}</span>
              </div>
              <div className="flex items-center gap-3">
                <UserStats user={user} />
                <motion.button
                  onClick={() => {
                    if (isOnline) changeMode(GAME_MODES.PVP);
                    logout();
                  }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4 text-red-400" />
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <ModeSelector currentMode={gameMode} onModeChange={handleModeChange} />

        {/* Difficulty selector — only for AI mode */}
        {!isOnline && (
          <DifficultySelector gameMode={gameMode} currentDifficulty={difficulty} onDifficultyChange={setDifficulty} />
        )}

        {/* Online room code badge */}
        <AnimatePresence>
          {isOnline && online.roomId && online.gameStarted && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-3 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary tracking-widest"
            >
              Room: {online.roomId} • You are {online.playerSymbol}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status message */}
        <div className="w-full max-w-[400px] mb-6 sm:mb-8 flex justify-center h-8 sm:h-10 items-center">
          <AnimatePresence mode="popLayout">
            <motion.h2
              key={getStatusMessage()}
              initial={{ y: -20, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className={`text-2xl sm:text-3xl font-extrabold tracking-wide drop-shadow-sm ${getStatusColor()}`}
            >
              {getStatusMessage()}
            </motion.h2>
          </AnimatePresence>
        </div>

        {/* Online Lobby */}
        <AnimatePresence>
          {showLobby && (
            <OnlineLobby
              isConnected={online.isConnected}
              isWaiting={online.isWaiting}
              roomId={online.roomId}
              error={online.error}
              opponentLeft={online.opponentLeft}
              onCreateRoom={online.createRoom}
              onJoinRoom={online.joinRoom}
              onLeaveRoom={online.leaveRoom}
            />
          )}
        </AnimatePresence>

        {/* Game Board */}
        {showBoard && (
          <Board 
            board={board} 
            handleMove={handleMove} 
            winningLine={winnerInfo?.line}
            disabled={boardDisabled}
          />
        )}

        {showBoard && (
          <ScoreBoard scores={scores} xIsNext={xIsNext} gameEnded={gameEnded || !!online.gameResult} />
        )}
        
        <GameControls onRestart={resetGame} onResetScores={resetScores} />

        {/* Move history — hidden in online mode */}
        {!isOnline && (
          <MoveHistory 
            history={history} 
            currentMove={currentMove} 
            jumpTo={jumpTo} 
            isGameOverGlobally={isGameOverGlobally}
            isViewingPast={isViewingPast}
          />
        )}
      </div>

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuth && (
          <AuthPage
            onClose={() => {
              setShowAuth(false);
              // If user just authenticated, auto-enter online mode
              const storedToken = localStorage.getItem('ttt-token');
              if (storedToken) {
                setTimeout(() => changeMode(GAME_MODES.ONLINE, storedToken), 100);
              }
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Game;
