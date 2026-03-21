import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from './AuthProvider';
import { gameEngine } from '../lib/gameEngine';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { STATE_NAMES } from '../lib/utils';
import { Leaderboard } from './Leaderboard';
import { ActivityFeed } from './ActivityFeed';
import { Upgrades } from './Upgrades';
import { USMap } from './USMap';
import { LogOut, Trophy, Volume2, VolumeX, Medal, Swords } from 'lucide-react';
import { doc, onSnapshot, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { useSound } from './SoundContext';
import { ACHIEVEMENTS } from '../lib/achievements';
import { AchievementsModal } from './AchievementsModal';

export function GameUI() {
  const { user, profile, logOut } = useAuth();
  const { playClick, isMuted, toggleMute } = useSound();
  const [localClicks, setLocalClicks] = useState(profile?.totalClicks || 0);
  const [localBalance, setLocalBalance] = useState(profile?.balance ?? profile?.totalClicks ?? 0);
  const [globalClicks, setGlobalClicks] = useState(0);
  const [stateClicks, setStateClicks] = useState(0);
  const [clickBump, setClickBump] = useState(0);
  const lastClickTime = useRef<number>(0);
  const [currentEvent, setCurrentEvent] = useState<any>(null);
  const [showAchievements, setShowAchievements] = useState(false);
  const [recentAchievement, setRecentAchievement] = useState<any>(null);

  useEffect(() => {
    if (user && profile) {
      gameEngine.init(user.uid, profile.state);
      setLocalClicks(profile.totalClicks);
    }
    return () => gameEngine.cleanup();
  }, [user, profile]);

  // Listen to global stats
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'global', 'stats'), (doc) => {
      if (doc.exists()) {
        setGlobalClicks(doc.data().totalClicks || 0);
        setCurrentEvent(doc.data().currentEvent || null);
      }
    });
    return () => unsub();
  }, []);

  // Listen to user's state stats
  useEffect(() => {
    if (!profile?.state) return;
    const unsub = onSnapshot(doc(db, 'states', profile.state), (doc) => {
      if (doc.exists()) {
        setStateClicks(doc.data().totalClicks || 0);
      }
    });
    return () => unsub();
  }, [profile?.state]);

  // Sync local clicks if server is ahead (e.g. from other devices or passive clicks)
  useEffect(() => {
    if (profile) {
      setLocalClicks(prev => Math.max(prev, profile.totalClicks));
    }
  }, [profile?.totalClicks]);

  // Achievement checker
  useEffect(() => {
    if (!profile || !user) return;
    const earned = profile.achievements || [];
    const newlyEarned = ACHIEVEMENTS.filter(a => !earned.includes(a.id) && a.check(profile));
    
    if (newlyEarned.length > 0) {
      const newIds = newlyEarned.map(a => a.id);
      updateDoc(doc(db, 'users', user.uid), {
        achievements: arrayUnion(...newIds)
      });
      setRecentAchievement(newlyEarned[0]);
      setTimeout(() => setRecentAchievement(null), 5000);
    }
  }, [profile, user]);

  const isEventActive = currentEvent && currentEvent.endTime > Date.now();
  const isParticipating = isEventActive && (profile?.state === currentEvent.stateA || profile?.state === currentEvent.stateB);
  const multiplier = isParticipating ? (currentEvent.multiplier || 2) : 1;

  // Passive clicks interval
  useEffect(() => {
    if (!profile || profile.clicksPerSecond <= 0) return;

    const interval = setInterval(() => {
      const cps = profile.clicksPerSecond * multiplier;
      // Optimistic UI update
      setLocalClicks(prev => prev + cps);
      setLocalBalance(prev => prev + cps);
      setGlobalClicks(prev => prev + cps);
      setStateClicks(prev => prev + cps);
      
      // Send to engine
      gameEngine.addClick(cps);
    }, 1000);

    return () => clearInterval(interval);
  }, [profile?.clicksPerSecond, multiplier]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const now = Date.now();
    if (now - lastClickTime.current < 40) return; // Max ~25 clicks per second limit
    lastClickTime.current = now;

    const clickPower = (profile?.clickPower || 1) * multiplier;
    
    playClick();

    // Optimistic UI update
    setLocalClicks(prev => prev + clickPower);
    setLocalBalance(prev => prev + clickPower);
    setGlobalClicks(prev => prev + clickPower);
    setStateClicks(prev => prev + clickPower);
    setClickBump(prev => prev + 1);
    
    // Send to engine
    gameEngine.addClick(clickPower, true);

    // Track event participation
    if (isParticipating && currentEvent?.id) {
      const participated = profile?.participatedEvents || [];
      if (!participated.includes(currentEvent.id)) {
        updateDoc(doc(db, 'users', user!.uid), {
          participatedEvents: arrayUnion(currentEvent.id)
        });
      }
    }

    // Visual effects
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    confetti({
      particleCount: 15,
      spread: 60,
      origin: { x: (rect.left + rect.width / 2) / window.innerWidth, y: (rect.top + rect.height / 2) / window.innerHeight },
      colors: ['#4f46e5', '#818cf8', '#c7d2fe'],
      disableForReducedMotion: true,
      zIndex: 100,
    });
  }, [profile?.clickPower, multiplier, isParticipating, currentEvent?.id, user, playClick]);

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-blue-600 text-white font-sans flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b-4 border-red-800 bg-red-600 flex items-center justify-between px-6 shrink-0 z-10 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border-4 border-blue-900 shadow-sm">
            <Trophy className="w-5 h-5 text-red-600" />
          </div>
          <h1 className="font-display text-2xl tracking-wide text-white drop-shadow-md">Click America</h1>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-xs text-red-200 font-bold uppercase tracking-wider">Global Total</div>
            <div className="font-display text-2xl text-white drop-shadow-md">{globalClicks.toLocaleString()}</div>
          </div>
          <div className="h-8 w-1 bg-red-800 rounded-full"></div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-bold">{profile.displayName}</div>
              <div className="text-xs text-red-200 font-bold">{STATE_NAMES[profile.state]}</div>
            </div>
            {profile.photoURL ? (
              <img src={profile.photoURL} alt="Profile" className="w-10 h-10 rounded-full border-4 border-white shadow-sm" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-800 border-4 border-white shadow-sm" />
            )}
            <button onClick={() => setShowAchievements(true)} className="p-2 text-red-100 hover:text-white transition-colors rounded-lg hover:bg-red-700 ml-2 relative">
              <Medal className="w-5 h-5" />
              {(profile.achievements?.length || 0) > 0 && (
                <span className="absolute top-1 right-1 w-3 h-3 bg-yellow-400 border-2 border-red-700 rounded-full"></span>
              )}
            </button>
            <button onClick={toggleMute} className="p-2 text-red-100 hover:text-white transition-colors rounded-lg hover:bg-red-700">
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <button onClick={logOut} className="p-2 text-red-100 hover:text-white transition-colors rounded-lg hover:bg-red-700">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden p-4 gap-4">
        {/* Left Panel: Leaderboards */}
        <aside className="w-full lg:w-80 flex flex-col overflow-hidden shrink-0">
          <Leaderboard userState={profile.state} />
        </aside>

        {/* Center: Game Area */}
        <section className="flex-1 flex flex-col relative bg-blue-500 border-4 border-blue-800 rounded-2xl shadow-inner overflow-hidden">
          {isEventActive && (
            <div className="bg-red-600 border-b-4 border-red-800 text-white px-6 py-3 flex justify-between items-center shrink-0 z-20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg border-2 border-red-800">
                  <Swords className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <div className="text-xs text-red-200 font-bold uppercase tracking-wider">Active State Rivalry</div>
                  <div className="font-display text-lg tracking-wide">{STATE_NAMES[currentEvent.stateA]} vs {STATE_NAMES[currentEvent.stateB]}</div>
                </div>
              </div>
              {isParticipating ? (
                <div className="bg-yellow-400 text-red-900 border-2 border-yellow-600 px-4 py-1 rounded-full text-sm font-black shadow-md uppercase tracking-wider">
                  {multiplier}x Clicks Active!
                </div>
              ) : (
                <div className="text-red-200 text-sm font-bold uppercase tracking-wider">Spectating</div>
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto relative z-10 flex flex-col">
            <div className="flex flex-col items-center justify-center p-8 min-h-[500px]">
              <div className="text-center mb-12">
                <h2 className="text-6xl font-display tracking-wide mb-2 drop-shadow-lg">{STATE_NAMES[profile.state]}</h2>
                <p className="text-blue-200 text-xl font-bold uppercase tracking-wider">State Total: <span className="font-display text-white drop-shadow-md">{stateClicks.toLocaleString()}</span></p>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95, y: 10 }}
                onClick={handleClick}
                className="relative group outline-none"
              >
                <div className="w-64 h-64 rounded-full bg-red-500 border-8 border-white shadow-[0_15px_0_#991b1b] flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent"></div>
                  <div className="text-center relative z-10">
                    <div className="text-6xl font-display text-white drop-shadow-lg select-none pointer-events-none">
                      CLICK
                    </div>
                  </div>
                </div>
              </motion.button>

              <div className="mt-16 flex gap-8 justify-center text-center">
                <div className="bg-white/10 p-4 rounded-xl border-4 border-white/20 min-w-[200px]">
                  <div className="text-sm text-blue-200 font-bold uppercase tracking-widest mb-1">Available Clicks</div>
                  <motion.div
                    key={clickBump}
                    initial={{ scale: 1.1, color: '#ffffff' }}
                    animate={{ scale: 1, color: '#facc15' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                    className="text-5xl font-display text-yellow-400 drop-shadow-md"
                  >
                    {Math.floor(localBalance).toLocaleString()}
                  </motion.div>
                </div>
                <div className="bg-white/10 p-4 rounded-xl border-4 border-white/20 min-w-[200px]">
                  <div className="text-sm text-blue-200 font-bold uppercase tracking-widest mb-1">Lifetime Clicks</div>
                  <div className="text-5xl font-display text-white drop-shadow-md">
                    {Math.floor(localClicks).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-8 pb-12 mt-auto">
              <USMap />
            </div>
          </div>

          {/* Bottom: Activity Feed */}
          <div className="h-48 shrink-0">
            <ActivityFeed />
          </div>
        </section>

        {/* Right Panel: Upgrades */}
        <aside className="w-full lg:w-80 flex flex-col overflow-hidden shrink-0">
          <Upgrades profile={profile} localBalance={localBalance} setLocalBalance={setLocalBalance} />
        </aside>
      </main>

      <AchievementsModal 
        isOpen={showAchievements} 
        onClose={() => setShowAchievements(false)} 
        earnedAchievements={profile.achievements || []} 
      />

      {/* Achievement Toast */}
      <AnimatePresence>
        {recentAchievement && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-8 right-8 bg-white border-4 border-blue-900 shadow-xl rounded-2xl p-4 flex items-center gap-4 z-50"
          >
            <div className="p-3 bg-yellow-400 border-2 border-yellow-600 text-red-700 rounded-xl">
              <recentAchievement.icon className="w-8 h-8" />
            </div>
            <div>
              <div className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-1">Achievement Unlocked!</div>
              <div className="text-blue-900 font-display text-xl">{recentAchievement.name}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
