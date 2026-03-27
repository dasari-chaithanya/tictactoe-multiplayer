import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, Wifi, WifiOff, Loader2, LogIn, Plus, ArrowLeft } from 'lucide-react';

const OnlineLobby = ({
  isConnected,
  isWaiting,
  roomId,
  error,
  opponentLeft,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
}) => {
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);

  const copyRoomCode = async () => {
    if (!roomId) return;
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for non-HTTPS
      const el = document.createElement('textarea');
      el.value = roomId;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="w-full max-w-[400px] mx-auto mb-6 floating-card rounded-2xl p-5 sm:p-6 border border-white/20 dark:border-white/10 relative overflow-hidden"
    >
      {/* Connection indicator */}
      <div className="flex items-center gap-2 mb-4">
        {isConnected ? (
          <>
            <Wifi className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Connected</span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4 text-red-400" />
            <span className="text-xs font-bold text-red-400 uppercase tracking-widest">Connecting…</span>
          </>
        )}
      </div>

      {/* Error display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 text-xs sm:text-sm font-semibold"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Opponent left notice */}
      <AnimatePresence>
        {opponentLeft && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400 text-xs sm:text-sm font-semibold"
          >
            Your opponent has disconnected. Create or join a new room to play again.
          </motion.div>
        )}
      </AnimatePresence>

      {/* Waiting state — show room code */}
      {isWaiting && roomId ? (
        <div className="text-center">
          <p className="text-sm font-bold text-foreground opacity-80 mb-2 tracking-wide">
            Share this code with a friend:
          </p>
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-3xl sm:text-4xl font-black tracking-[0.3em] bg-gradient-to-r from-primary to-indigo-500 bg-clip-text text-transparent select-all">
              {roomId}
            </span>
            <motion.button
              onClick={copyRoomCode}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors cursor-pointer"
            >
              {copied ? (
                <Check className="w-5 h-5 text-emerald-500" />
              ) : (
                <Copy className="w-5 h-5 text-primary" />
              )}
            </motion.button>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-foreground opacity-60 mb-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="font-semibold">Waiting for opponent…</span>
          </div>

          <motion.button
            onClick={onLeaveRoom}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-red-400 dark:hover:text-red-400 transition-colors cursor-pointer flex items-center gap-1 mx-auto"
          >
            <ArrowLeft className="w-3 h-3" />
            Cancel
          </motion.button>
        </div>
      ) : (
        /* Default state — Create or Join */
        <div className="space-y-4">
          <motion.button
            onClick={onCreateRoom}
            disabled={!isConnected}
            whileHover={isConnected ? { scale: 1.03 } : {}}
            whileTap={isConnected ? { scale: 0.97 } : {}}
            className={`w-full py-3.5 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all duration-300 shadow-md border ${
              isConnected
                ? 'bg-gradient-to-r from-primary to-indigo-500 text-white border-primary/30 hover:shadow-lg hover:shadow-primary/20 cursor-pointer'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 border-slate-300 dark:border-slate-700 cursor-not-allowed'
            }`}
          >
            <Plus className="w-5 h-5" />
            Create Room
          </motion.button>

          <div className="relative flex items-center">
            <div className="flex-grow border-t border-slate-300 dark:border-slate-700" />
            <span className="mx-3 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">or</span>
            <div className="flex-grow border-t border-slate-300 dark:border-slate-700" />
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ROOM CODE"
              maxLength={6}
              className="flex-1 py-3 px-4 rounded-xl text-center font-bold tracking-[0.2em] text-sm sm:text-base bg-white/50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-foreground placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
            <motion.button
              onClick={() => {
                onJoinRoom(joinCode);
                setJoinCode('');
              }}
              disabled={!isConnected || joinCode.trim().length === 0}
              whileHover={isConnected && joinCode.trim().length > 0 ? { scale: 1.05 } : {}}
              whileTap={isConnected && joinCode.trim().length > 0 ? { scale: 0.95 } : {}}
              className={`px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-1.5 transition-all duration-300 shadow-md border ${
                isConnected && joinCode.trim().length > 0
                  ? 'bg-gradient-to-r from-secondary to-fuchsia-500 text-white border-secondary/30 hover:shadow-lg cursor-pointer'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 border-slate-300 dark:border-slate-700 cursor-not-allowed'
              }`}
            >
              <LogIn className="w-4 h-4" />
              Join
            </motion.button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default OnlineLobby;
