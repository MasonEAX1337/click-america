import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import { doc, updateDoc, increment, collection, addDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import { motion } from 'framer-motion';
import { Zap, MousePointerClick, TrendingUp } from 'lucide-react';
import { useSound } from './SoundContext';

interface Upgrade {
  id: string;
  name: string;
  description: string;
  baseCost: number;
  icon: React.ElementType;
  type: 'clickPower' | 'clicksPerSecond';
  value: number;
}

const UPGRADES: Upgrade[] = [
  {
    id: 'click_power_1',
    name: 'Better Mouse',
    description: '+1 Click Power',
    baseCost: 100,
    icon: MousePointerClick,
    type: 'clickPower',
    value: 1
  },
  {
    id: 'click_power_5',
    name: 'Mechanical Keyboard',
    description: '+5 Click Power',
    baseCost: 500,
    icon: Zap,
    type: 'clickPower',
    value: 5
  },
  {
    id: 'auto_clicker_1',
    name: 'Intern',
    description: '+1 Auto Click / sec',
    baseCost: 200,
    icon: TrendingUp,
    type: 'clicksPerSecond',
    value: 1
  }
];

export function Upgrades({ profile, localBalance, setLocalBalance }: { profile: any, localBalance: number, setLocalBalance: React.Dispatch<React.SetStateAction<number>> }) {
  const { user } = useAuth();
  const { playUpgrade } = useSound();
  const [buying, setBuying] = useState<string | null>(null);

  const handleBuy = async (upgrade: Upgrade) => {
    if (!user || localBalance < upgrade.baseCost || buying) return;
    
    setBuying(upgrade.id);
    try {
      const userRef = doc(db, 'users', user.uid);
      
      // Use a transaction to ensure atomic purchase and prevent negative balance
      const newBalance = await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) {
          throw new Error("User document does not exist!");
        }

        const userData = userDoc.data();
        const currentVal = userData[upgrade.type] || (upgrade.type === 'clickPower' ? 1 : 0);
        const nextLevel = Math.floor(currentVal / upgrade.value) + 1;
        const cost = Math.floor(upgrade.baseCost * Math.pow(1.5, nextLevel - 1));
        const currentBalance = userData.balance || 0;

        if (currentBalance < cost) {
          throw new Error("Insufficient balance");
        }

        transaction.update(userRef, {
          [upgrade.type]: currentVal + upgrade.value,
          balance: currentBalance - cost
        });

        return currentBalance - cost;
      });

      // Update local balance to match the transaction result
      setLocalBalance(newBalance);
      
      playUpgrade();

      // Log activity
      await addDoc(collection(db, 'activity'), {
        userId: user.uid,
        displayName: profile.displayName,
        state: profile.state,
        message: `unlocked ${upgrade.name}!`,
        timestamp: serverTimestamp()
      });

    } catch (error) {
      console.error("Failed to buy upgrade:", error);
      // Re-sync local balance on failure
      setLocalBalance(profile.balance);
    } finally {
      setBuying(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl overflow-hidden border-4 border-blue-900 shadow-xl">
      <div className="bg-red-600 p-4 border-b-4 border-red-800">
        <h3 className="text-xl font-display text-white text-center tracking-wide">Upgrades</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-100">
        {UPGRADES.map((upgrade) => {
          const currentVal = profile[upgrade.type] || (upgrade.type === 'clickPower' ? 1 : 0);
          const nextLevel = Math.floor(currentVal / upgrade.value) + 1;
          const cost = Math.floor(upgrade.baseCost * Math.pow(1.5, nextLevel - 1));
          const canAfford = localBalance >= cost;

          return (
            <motion.button
              key={upgrade.id}
              onClick={() => handleBuy(upgrade)}
              disabled={!canAfford || buying === upgrade.id}
              className={`w-full flex items-center gap-4 p-3 rounded-xl border-4 text-left transition-all relative overflow-hidden ${
                canAfford 
                  ? 'bg-blue-50 border-blue-200 hover:bg-blue-100 hover:-translate-y-1 hover:shadow-[0_6px_0_#bfdbfe] active:translate-y-0 active:shadow-none cursor-pointer' 
                  : 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed'
              }`}
            >
              {canAfford && (
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer pointer-events-none" />
              )}
              <div className={`p-3 rounded-xl border-2 relative z-10 ${canAfford ? 'bg-blue-500 border-blue-600 text-white shadow-inner' : 'bg-slate-300 border-slate-400 text-slate-500'}`}>
                <upgrade.icon className="w-6 h-6" />
              </div>
              <div className="flex-1 relative z-10">
                <div className="font-display text-lg text-blue-900 tracking-wide">{upgrade.name}</div>
                <div className="text-sm font-bold text-slate-500">{upgrade.description}</div>
                <div className="text-sm font-display mt-1 text-red-600 drop-shadow-sm">Cost: {cost.toLocaleString()}</div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
