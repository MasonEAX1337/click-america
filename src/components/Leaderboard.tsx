import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { STATE_NAMES } from '../lib/utils';
import { motion } from 'framer-motion';

interface StateData {
  name: string;
  totalClicks: number;
}

export function Leaderboard({ userState }: { userState: string }) {
  const [states, setStates] = useState<StateData[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'states'),
      orderBy('totalClicks', 'desc'),
      limit(10)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const newStates: StateData[] = [];
      snapshot.forEach((doc) => {
        newStates.push({ name: doc.id, totalClicks: doc.data().totalClicks || 0 });
      });
      setStates(newStates);
    });

    return () => unsub();
  }, []);

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl overflow-hidden border-4 border-blue-900 shadow-xl">
      <div className="bg-blue-800 p-3 sm:p-4 border-b-4 border-blue-950">
        <h3 className="text-xl font-display text-white text-center tracking-wide">Top States</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-slate-100">
        {states.map((state, index) => (
          <motion.div
            key={state.name}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`flex items-center justify-between p-3 border-4 rounded-xl font-bold ${
              state.name === userState 
                ? 'bg-red-100 border-red-300 text-red-800 shadow-sm' 
                : 'bg-white border-slate-200 text-blue-900 shadow-sm'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-display text-sm border-2 ${
                state.name === userState ? 'bg-red-200 border-red-400 text-red-900' : 'bg-blue-100 border-blue-200 text-blue-800'
              }`}>
                {index + 1}
              </div>
              <div className="font-display text-lg tracking-wide">{STATE_NAMES[state.name] || state.name}</div>
            </div>
            <div className="font-display text-xl text-yellow-500 drop-shadow-sm">{state.totalClicks.toLocaleString()}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
