import React, { useEffect, useState, useRef } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { useSound } from './SoundContext';

interface Activity {
  id: string;
  userId: string;
  displayName: string;
  state: string;
  message: string;
  timestamp: any;
}

export function ActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const { playNotification } = useSound();
  const isInitial = useRef(true);

  useEffect(() => {
    const q = query(
      collection(db, 'activity'),
      orderBy('timestamp', 'desc'),
      limit(10)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const newActivities: Activity[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        newActivities.push({
          id: doc.id,
          userId: data.userId,
          displayName: data.displayName,
          state: data.state,
          message: data.message,
          timestamp: data.timestamp
        });
      });
      setActivities(newActivities);

      if (isInitial.current) {
        isInitial.current = false;
      } else {
        const hasNew = snapshot.docChanges().some(change => change.type === 'added');
        if (hasNew) {
          playNotification();
        }
      }
    });

    return () => unsub();
  }, [playNotification]);

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl overflow-hidden border-4 border-blue-900 shadow-xl">
      <div className="bg-blue-800 p-3 border-b-4 border-blue-950">
        <h3 className="text-lg font-display text-white text-center tracking-wide">Live Feed</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-slate-100">
        <AnimatePresence initial={false}>
          {activities.map((activity) => (
            <motion.div
              key={activity.id}
              layout
              initial={{ opacity: 0, y: -20, height: 0, backgroundColor: 'rgba(254, 226, 226, 0.5)' }}
              animate={{ opacity: 1, y: 0, height: 'auto', backgroundColor: 'rgba(248, 250, 252, 1)' }}
              exit={{ opacity: 0, scale: 0.9, height: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="text-sm font-bold text-blue-900 flex flex-col gap-1 p-3 border-b-4 border-slate-200 bg-slate-50 rounded-xl mb-2 shadow-sm"
            >
              <div className="flex justify-between items-center gap-2">
                <span className="text-red-600 font-display tracking-wide truncate">
                  {activity.displayName} <span className="text-slate-400 text-xs font-sans">({activity.state})</span>
                </span>
                <span className="text-slate-400 text-xs font-sans shrink-0">
                  {activity.timestamp?.toDate ? formatDistanceToNow(activity.timestamp.toDate(), { addSuffix: true }) : 'just now'}
                </span>
              </div>
              <span className="text-blue-800">{activity.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
