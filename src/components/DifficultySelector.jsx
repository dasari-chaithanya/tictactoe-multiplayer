import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DIFFICULTIES, GAME_MODES } from '../hooks/useGameLogic';

const DifficultySelector = ({ gameMode, currentDifficulty, onDifficultyChange }) => {
  const difficulties = [
    { id: DIFFICULTIES.EASY, label: 'Easy' },
    { id: DIFFICULTIES.MEDIUM, label: 'Medium' },
    { id: DIFFICULTIES.HARD, label: 'Hard' }
  ];

  return (
    <AnimatePresence>
      {gameMode === GAME_MODES.PVAI && (
        <motion.div 
          initial={{ opacity: 0, height: 0, marginTop: 0 }}
          animate={{ opacity: 1, height: 'auto', marginTop: -16 }}
          exit={{ opacity: 0, height: 0, marginTop: 0 }}
          className="flex gap-1 sm:gap-2 p-1 floating-card rounded-full w-full max-w-[280px] mx-auto mb-6 relative z-0 border border-white/20 dark:border-white/10 bg-white/20 dark:bg-slate-800/40"
          style={{ overflow: 'hidden' }}
        >
          {difficulties.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => onDifficultyChange(id)}
              className={`relative px-2 py-1.5 rounded-full flex-1 flex justify-center items-center text-xs sm:text-sm font-bold transition-colors duration-300 z-20 ${
                currentDifficulty === id 
                  ? 'text-white' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-secondary dark:hover:text-fuchsia-300 cursor-pointer'
              }`}
            >
              {currentDifficulty === id && (
                <motion.div
                  layoutId="active-difficulty"
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-secondary to-fuchsia-500 shadow-sm -z-10"
                  initial={false}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                />
              )}
              <span className="relative z-10 tracking-widest uppercase text-[10px] sm:text-xs">{label}</span>
            </button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DifficultySelector;
