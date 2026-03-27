import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History } from 'lucide-react';

const MoveHistory = ({ history, currentMove, jumpTo, isGameOverGlobally, isViewingPast }) => {
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      const activeElement = listRef.current.children[currentMove];
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [currentMove]);

  return (
    <div className="w-full max-w-[400px] mx-auto mt-6 floating-card rounded-2xl p-4 sm:p-5 flex flex-col items-center relative overflow-hidden">
      <AnimatePresence>
        {isGameOverGlobally && isViewingPast && (
          <motion.div 
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -30, opacity: 0 }}
            className="absolute top-0 inset-x-0 bg-yellow-500/20 border-b border-yellow-500/50 py-1 text-center pointer-events-none"
          >
            <span className="text-[10px] sm:text-xs font-bold text-yellow-600 dark:text-yellow-400 uppercase tracking-widest drop-shadow-sm">
              Review Mode Active
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`flex items-center gap-2 mb-3 text-sm sm:text-base font-bold text-foreground opacity-90 transition-all duration-300 ${isGameOverGlobally && isViewingPast ? 'mt-4' : ''}`}>
        <History className="w-5 h-5" />
        <span className="tracking-widest uppercase text-xs sm:text-sm">Time Travel</span>
      </div>
      
      <div 
        ref={listRef}
        className="w-full max-h-[160px] overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-1.5 sm:gap-2"
      >
        {history.map((_, moveIndex) => {
          const isCurrent = moveIndex === currentMove;
          const description = moveIndex === 0 ? 'Go to game start' : `Go to move #${moveIndex}`;
          
          return (
            <motion.button
              key={moveIndex}
              onClick={() => jumpTo(moveIndex)}
              disabled={!isGameOverGlobally}
              className={`w-full py-2.5 px-4 rounded-xl text-left text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center shadow-sm border ${
                isCurrent 
                  ? 'bg-primary border-primary text-white scale-[1.02] shadow-primary/20 cursor-default ring-1 ring-primary/50' 
                  : `dark:border-slate-700/50 border-slate-200/50 ${!isGameOverGlobally ? 'opacity-50 cursor-not-allowed bg-slate-100/50 dark:bg-slate-800/30 text-slate-400 dark:text-slate-500' : 'bg-white/40 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-700/80 cursor-pointer'}`
              }`}
              whileHover={!isCurrent && isGameOverGlobally ? { scale: 1.02 } : {}}
              whileTap={!isCurrent && isGameOverGlobally ? { scale: 0.98 } : {}}
            >
              <span className={`w-2 h-2 rounded-full mr-3 transition-colors ${isCurrent ? 'bg-white' : 'bg-slate-300 dark:bg-slate-700'}`} />
              {description}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default MoveHistory;
