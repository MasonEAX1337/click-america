import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import { US_STATES, STATE_NAMES } from '../lib/utils';
import { motion } from 'framer-motion';

export function StateSelector() {
  const { updateProfile, user } = useAuth();
  const [selectedState, setSelectedState] = useState('CA');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile({ state: selectedState });
    } catch (error) {
      console.error("Error setting state:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-900 p-4 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-800 to-blue-950">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white border-8 border-blue-600 rounded-3xl p-8 shadow-[0_0_40px_rgba(37,99,235,0.3)] relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-4 bg-red-600"></div>
        <div className="text-center mb-8 mt-4">
          <h1 className="text-3xl sm:text-4xl font-display text-blue-900 mb-2 tracking-wide drop-shadow-sm">Choose Your State</h1>
          <p className="text-slate-600 font-bold">Select your state to start generating clicks for the national leaderboard.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="state" className="block text-lg font-display text-blue-800 mb-2 tracking-wide">
              SELECT STATE
            </label>
            <select
              id="state"
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="w-full bg-slate-100 border-4 border-slate-300 text-blue-900 font-bold rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-200 transition-all"
            >
              {US_STATES.map((state) => (
                <option key={state} value={state}>
                  {STATE_NAMES[state]} ({state})
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-500 text-white font-display text-xl rounded-xl px-4 py-4 transition-all disabled:opacity-50 border-b-4 border-red-800 hover:border-b-0 hover:translate-y-1 active:bg-red-700 shadow-lg"
          >
            {loading ? 'JOINING...' : 'JOIN THE BATTLE'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
