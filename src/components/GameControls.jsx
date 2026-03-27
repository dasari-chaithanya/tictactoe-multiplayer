import React from 'react';
import { RotateCcw, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';

const GameControls = ({ onRestart, onResetScores }) => {
  return (
    <div className="flex gap-3 sm:gap-4 w-full max-w-[400px] mx-auto mt-6 sm:mt-8">
      <motion.button
        className="floating-card flex-1 flex items-center justify-center gap-2 py-3.5 px-3 sm:px-4 rounded-xl font-bold text-primary hover:text-primary-foreground hover:bg-primary transition-all duration-300 shadow-md cursor-pointer border border-primary/20"
        onClick={onRestart}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <RotateCcw className="w-5 h-5" />
        <span className="text-sm sm:text-base tracking-wide">Restart</span>
      </motion.button>
      
      <motion.button
        className="floating-card flex-1 flex items-center justify-center gap-2 py-3.5 px-3 sm:px-4 rounded-xl font-bold text-danger hover:text-white hover:bg-danger transition-all duration-300 shadow-md cursor-pointer border border-danger/20"
        onClick={onResetScores}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Trophy className="w-5 h-5" />
        <span className="text-sm sm:text-base tracking-wide">Reset Scores</span>
      </motion.button>
    </div>
  );
};

export default GameControls;
