import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Trophy } from 'lucide-react';

const ScoreCard = ({ label, score, colorClass, isLeading, icon: Icon, isDraw, activeTurn }) => {
  const [prevScore, setPrevScore] = useState(score);
  const [justScored, setJustScored] = useState(false);

  useEffect(() => {
    if (score > prevScore) {
      setTimeout(() => setJustScored(true), 0);
      const timer = setTimeout(() => setJustScored(false), 1000);
      setPrevScore(score);
      return () => clearTimeout(timer);
    }
  }, [score, prevScore]);

  return (
    <motion.div 
      className={`floating-card rounded-2xl p-4 sm:p-5 text-center flex-1 relative overflow-hidden flex flex-col items-center justify-center transition-all duration-500 border-2 ${
        isLeading && !isDraw ? `border-yellow-400/50 shadow-lg shadow-yellow-500/20` : 'border-white/20 dark:border-white/5'
      } ${activeTurn ? `ring-2 ring-primary/50 opacity-100 scale-105 z-10` : 'opacity-80 scale-100'}`}
      initial={{ scale: 0.9, opacity: 0, y: 20 }}
      animate={{ 
        scale: activeTurn ? 1.05 : 1, 
        opacity: activeTurn ? 1 : 0.85, 
        y: 0 
      }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {isLeading && !isDraw && (
        <div className="absolute top-2 right-2 text-yellow-500">
          <Trophy className="w-4 h-4 sm:w-5 sm:h-5 drop-shadow-sm" />
        </div>
      )}
      
      <div className={`flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider mb-2 ${colorClass}`}>
        {Icon && <Icon className="w-4 h-4 sm:w-5 sm:h-5" />}
        {label}
      </div>
      
      <div className="relative h-8 sm:h-10 flex items-center justify-center">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={score}
            initial={{ y: -20, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: justScored ? 1.3 : 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className={`text-3xl sm:text-4xl font-black drop-shadow-sm ${justScored ? colorClass : 'text-foreground'}`}
          >
            {score}
          </motion.div>
        </AnimatePresence>
      </div>

      {justScored && (
        <motion.div
          className="absolute inset-0 bg-white/30 dark:bg-white/10"
          initial={{ opacity: 0.5, scale: 1 }}
          animate={{ opacity: 0, scale: 1.5 }}
          transition={{ duration: 0.6 }}
        />
      )}
    </motion.div>
  );
};

const ScoreBoard = ({ scores, xIsNext, gameEnded }) => {
  const leaderBoard = [
    { type: 'X', score: scores.X },
    { type: 'O', score: scores.O }
  ].sort((a, b) => b.score - a.score);
  
  const topScore = leaderBoard[0].score;
  const isDrawLeading = topScore === 0;

  return (
    <div className="flex justify-between items-stretch gap-3 sm:gap-4 w-full max-w-[400px] mx-auto mt-2 mb-2">
      <ScoreCard 
        label="Player X" 
        score={scores.X} 
        colorClass="text-primary" 
        isLeading={scores.X === topScore && !isDrawLeading}
        icon={User}
        isDraw={false}
        activeTurn={!gameEnded && xIsNext}
      />
      <ScoreCard 
        label="Draws" 
        score={scores.Draws} 
        colorClass="text-slate-500 dark:text-slate-400" 
        isLeading={false}
        isDraw={true}
        activeTurn={false}
      />
      <ScoreCard 
        label="Player O" 
        score={scores.O} 
        colorClass="text-secondary" 
        isLeading={scores.O === topScore && !isDrawLeading}
        icon={User}
        isDraw={false}
        activeTurn={!gameEnded && !xIsNext}
      />
    </div>
  );
};

export default ScoreBoard;
