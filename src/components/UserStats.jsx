import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, XCircle, Minus } from 'lucide-react';

const UserStats = ({ user }) => {
  if (!user) return null;

  const stats = [
    { label: 'Wins', value: user.wins || 0, icon: Trophy, color: 'text-emerald-500' },
    { label: 'Losses', value: user.losses || 0, icon: XCircle, color: 'text-red-400' },
    { label: 'Draws', value: user.draws || 0, icon: Minus, color: 'text-slate-400' },
  ];

  const total = (user.wins || 0) + (user.losses || 0) + (user.draws || 0);
  const winRate = total > 0 ? Math.round(((user.wins || 0) / total) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 sm:gap-4"
    >
      {stats.map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="flex items-center gap-1" title={label}>
          <Icon className={`w-3.5 h-3.5 ${color}`} />
          <span className={`text-xs font-bold ${color}`}>{value}</span>
        </div>
      ))}
      {total > 0 && (
        <span className="text-[10px] font-bold text-foreground opacity-50 uppercase tracking-wider">
          {winRate}% WR
        </span>
      )}
    </motion.div>
  );
};

export default UserStats;
