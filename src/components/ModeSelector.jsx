import React from 'react';
import { GAME_MODES } from '../hooks/useGameLogic';
import { Users, Bot, Wifi } from 'lucide-react';
import { motion } from 'framer-motion';

const ModeSelector = ({ currentMode, onModeChange }) => {
  const modes = [
    { id: GAME_MODES.PVP, label: 'Local', icon: Users },
    { id: GAME_MODES.PVAI, label: 'vs AI', icon: Bot },
    { id: GAME_MODES.ONLINE, label: 'Online', icon: Wifi }
  ];

  return (
    <div className="flex gap-1 sm:gap-2 p-1.5 floating-card rounded-2xl sm:rounded-full w-full max-w-[400px] mx-auto mb-6 sm:mb-8 relative z-10 border border-white/20 dark:border-white/10 bg-white/30 dark:bg-slate-900/40">
      {modes.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onModeChange(id)}
          className={`relative px-3 py-2 sm:px-4 sm:py-3 rounded-xl sm:rounded-full flex-1 flex justify-center items-center gap-1.5 sm:gap-2 text-sm sm:text-base font-bold transition-colors duration-300 z-20 ${
            currentMode === id 
              ? 'text-white drop-shadow-md' 
              : 'text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary-foreground cursor-pointer'
          }`}
        >
          {currentMode === id && (
            <motion.div
              layoutId="active-mode"
              className="absolute inset-0 rounded-xl sm:rounded-full bg-gradient-to-r from-primary to-indigo-500 shadow-lg -z-10"
              initial={false}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
            />
          )}
          <Icon className="w-4 h-4 sm:w-5 sm:h-5 relative z-10" />
          <span className="hidden sm:inline relative z-10 tracking-wide">{label}</span>
        </button>
      ))}
    </div>
  );
};

export default ModeSelector;
