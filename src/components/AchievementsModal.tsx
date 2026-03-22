import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock } from 'lucide-react';
import { ACHIEVEMENTS } from '../lib/achievements';

interface AchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  earnedAchievements: string[];
}

export function AchievementsModal({ isOpen, onClose, earnedAchievements }: AchievementsModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-900/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white border-4 border-blue-900 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl"
        >
          <div className="flex items-center justify-between p-4 sm:p-6 border-b-4 border-blue-950 bg-blue-800">
            <h2 className="text-2xl font-display text-white tracking-wide">Achievements</h2>
            <button
              onClick={onClose}
              className="p-2 text-blue-200 hover:text-white hover:bg-blue-700 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-4 sm:p-6 max-h-[60vh] overflow-y-auto bg-slate-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ACHIEVEMENTS.map((achievement) => {
                const isEarned = earnedAchievements.includes(achievement.id);
                const Icon = isEarned ? achievement.icon : Lock;

                return (
                  <div
                    key={achievement.id}
                    className={`flex items-center gap-4 p-4 rounded-xl border-4 transition-all ${
                      isEarned
                        ? 'bg-yellow-50 border-yellow-400 shadow-sm'
                        : 'bg-slate-200 border-slate-300 opacity-70'
                    }`}
                  >
                    <div
                      className={`p-3 rounded-xl border-2 ${
                        isEarned ? 'bg-yellow-400 border-yellow-600 text-red-700' : 'bg-slate-300 border-slate-400 text-slate-500'
                      }`}
                    >
                      <Icon className="w-8 h-8" />
                    </div>
                    <div>
                      <div className={`font-display text-lg tracking-wide ${isEarned ? 'text-blue-900' : 'text-slate-600'}`}>
                        {achievement.name}
                      </div>
                      <div className={`text-sm font-bold ${isEarned ? 'text-blue-700' : 'text-slate-500'}`}>{achievement.description}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
