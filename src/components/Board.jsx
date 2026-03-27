import React from 'react';
import Square from './Square';
import { motion } from 'framer-motion';

const Board = ({ board, handleMove, winningLine, disabled }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 30, rotateX: 10 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
      style={{ perspective: 1000 }}
      className="w-full max-w-[320px] sm:max-w-[400px] aspect-square mx-auto mb-6 relative z-10"
    >
      <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full h-full p-3 sm:p-5 floating-card rounded-2xl sm:rounded-3xl border-2 border-white/40 dark:border-white/10 hover:border-primary/50 transition-colors duration-500">
        {board.map((value, index) => {
          const isWinningCell = winningLine?.includes(index);
          return (
            <Square
              key={index}
              value={value}
              onClick={() => handleMove(index)}
              isWinningCell={isWinningCell}
              disabled={disabled || value !== null}
            />
          );
        })}
      </div>
    </motion.div>
  );
};

export default Board;
