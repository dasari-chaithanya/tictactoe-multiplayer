import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const XIcon = () => (
  <motion.svg
    viewBox="0 0 100 100"
    className="w-full h-full drop-shadow-[0_0_8px_rgba(99,102,241,0.6)]"
    initial="hidden"
    animate="visible"
  >
    <defs>
      <linearGradient id="xGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#818cf8" />
        <stop offset="100%" stopColor="#4f46e5" />
      </linearGradient>
    </defs>
    <motion.line
      x1="20" y1="20" x2="80" y2="80"
      stroke="url(#xGradient)" strokeWidth="12" strokeLinecap="round"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    />
    <motion.line
      x1="80" y1="20" x2="20" y2="80"
      stroke="url(#xGradient)" strokeWidth="12" strokeLinecap="round"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut", delay: 0.2 }}
    />
  </motion.svg>
);

const OIcon = () => (
  <motion.svg
    viewBox="0 0 100 100"
    className="w-full h-full drop-shadow-[0_0_8px_rgba(217,70,239,0.6)]"
    initial="hidden"
    animate="visible"
  >
    <defs>
      <linearGradient id="oGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#e879f9" />
        <stop offset="100%" stopColor="#c026d3" />
      </linearGradient>
    </defs>
    <motion.circle
      cx="50" cy="50" r="30"
      stroke="url(#oGradient)" strokeWidth="12" fill="transparent"
      strokeLinecap="round"
      initial={{ pathLength: 0, opacity: 0, rotate: -90 }}
      animate={{ pathLength: 1, opacity: 1, rotate: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    />
  </motion.svg>
);

const Square = ({ value, onClick, isWinningCell, disabled }) => {
  return (
    <motion.button
      className={`relative w-full h-full pb-[100%] rounded-xl sm:rounded-2xl flex items-center justify-center cursor-pointer transition-all duration-300 overflow-hidden ${
        isWinningCell 
          ? 'bg-success/20 border-2 border-success shadow-[0_0_20px_rgba(16,185,129,0.6)] z-20' 
          : 'glass hover:bg-white/20 dark:hover:bg-slate-800/60'
      } ${disabled && !isWinningCell ? 'cursor-default' : ''}`}
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled && !value ? { scale: 1.05, boxShadow: "0 0 20px rgba(255,255,255,0.3)" } : {}}
      whileTap={!disabled && !value ? { scale: 0.95 } : {}}
      animate={isWinningCell ? { scale: [1, 1.05, 1], transition: { repeat: Infinity, duration: 1.5 } } : { scale: 1 }}
      aria-label={value ? `Cell occupied by ${value}` : 'Empty cell'}
    >
      <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6">
        <AnimatePresence>
          {value === 'X' && (
            <motion.div
              key="X"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="w-full h-full flex items-center justify-center"
            >
              <XIcon />
            </motion.div>
          )}
          {value === 'O' && (
            <motion.div
              key="O"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="w-full h-full flex items-center justify-center"
            >
              <OIcon />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.button>
  );
};

export default Square;
