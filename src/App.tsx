/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AuthProvider, useAuth } from './components/AuthProvider';
import { SoundProvider } from './components/SoundContext';
import { StateSelector } from './components/StateSelector';
import { GameUI } from './components/GameUI';
import { motion } from 'framer-motion';
import { LogIn } from 'lucide-react';

function MainApp() {
  const { user, profile, loading, signIn } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-blue-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white border-t-red-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-900 p-4 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-800 to-blue-950">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white border-8 border-red-600 rounded-3xl p-8 shadow-[0_0_40px_rgba(220,38,38,0.3)] text-center relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-4 bg-red-600"></div>
          <h1 className="text-4xl sm:text-5xl font-display text-blue-900 mb-4 tracking-wide drop-shadow-sm mt-4">CLICK AMERICA</h1>
          <p className="text-slate-600 mb-8 font-bold text-lg">The ultimate real-time national clicker battle. Join your state and dominate the leaderboard.</p>
          
          <button
            onClick={signIn}
            className="w-full bg-red-600 hover:bg-red-500 text-white font-display text-xl rounded-xl px-6 py-4 transition-all flex items-center justify-center gap-3 border-b-4 border-red-800 hover:border-b-0 hover:translate-y-1 active:bg-red-700 shadow-lg"
          >
            <LogIn className="w-6 h-6" />
            PLAY NOW
          </button>
        </motion.div>
      </div>
    );
  }

  if (!profile) {
    return <StateSelector />;
  }

  return <GameUI />;
}

export default function App() {
  return (
    <SoundProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </SoundProvider>
  );
}

