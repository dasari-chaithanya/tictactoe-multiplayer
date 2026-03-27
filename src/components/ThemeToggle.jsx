import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';

const ThemeToggle = () => {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) return savedTheme;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <motion.button
      onClick={toggleTheme}
      className="p-2 sm:p-3 rounded-full glass hover:bg-black/5 dark:hover:bg-white/5 transition-colors group flex items-center justify-center cursor-pointer"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      aria-label="Toggle Theme"
      title="Toggle Theme"
    >
      {theme === 'light' ? (
        <Moon className="w-5 h-5 sm:w-6 sm:h-6 text-slate-700 group-hover:-rotate-12 transition-transform duration-500" />
      ) : (
        <Sun className="w-5 h-5 sm:w-6 sm:h-6 text-orange-400 group-hover:rotate-90 transition-transform duration-500" />
      )}
    </motion.button>
  );
};

export default ThemeToggle;
