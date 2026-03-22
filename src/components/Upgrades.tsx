import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import { doc, updateDoc, increment, collection, addDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import { motion } from 'framer-motion';
import { Hand, Megaphone, Star, Bird, Bell, UserPlus, Store, MapPin, Briefcase, Radio, Landmark } from 'lucide-react';
import { useSound } from './SoundContext';
import { gameEngine } from '../lib/gameEngine';

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
  // Active (Click Power)
  {
    id: 'click_power_1',
    name: 'Foam Finger',
    description: '+1 Click Power',
    baseCost: 50,
    icon: Hand,
    type: 'clickPower',
    value: 1
  },
  {
    id: 'click_power_5',
    name: 'Megaphone',
    description: '+5 Click Power',
    baseCost: 500,
    icon: Megaphone,
    type: 'clickPower',
    value: 5
  },
  {
    id: 'click_power_25',
    name: "Uncle Sam's Hat",
    description: '+25 Click Power',
    baseCost: 5000,
    icon: Star,
    type: 'clickPower',
    value: 25
  },
  {
    id: 'click_power_100',
    name: 'Bald Eagle Strike',
    description: '+100 Click Power',
    baseCost: 50000,
    icon: Bird,
    type: 'clickPower',
    value: 100
  },
  {
    id: 'click_power_500',
    name: 'Liberty Bell Ringer',
    description: '+500 Click Power',
    baseCost: 500000,
    icon: Bell,
    type: 'clickPower',
    value: 500
  },
  
  // Passive (CPS)
  {
    id: 'auto_clicker_1',
    name: 'Local Campaigner',
    description: '+1 Auto Click / sec',
    baseCost: 100,
    icon: UserPlus,
    type: 'clicksPerSecond',
    value: 1
  },
  {
    id: 'auto_clicker_5',
    name: 'State Fair Booth',
    description: '+5 Auto Clicks / sec',
    baseCost: 1000,
    icon: Store,
    type: 'clicksPerSecond',
    value: 5
  },
  {
    id: 'auto_clicker_25',
    name: 'Highway Billboard',
    description: '+25 Auto Clicks / sec',
    baseCost: 10000,
    icon: MapPin,
    type: 'clicksPerSecond',
    value: 25
  },
  {
    id: 'auto_clicker_100',
    name: 'Lobbyist',
    description: '+100 Auto Clicks / sec',
    baseCost: 100000,
    icon: Briefcase,
    type: 'clicksPerSecond',
    value: 100
  },
  {
    id: 'auto_clicker_500',
    name: 'National Broadcast',
    description: '+500 Auto Clicks / sec',
    baseCost: 1000000,
    icon: Radio,
    type: 'clicksPerSecond',
    value: 500
  },
  {
    id: 'auto_clicker_2500',
    name: 'Super PAC',
    description: '+2,500 Auto Clicks / sec',
    baseCost: 10000000,
    icon: Landmark,
    type: 'clicksPerSecond',
    value: 2500
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
      // Flush any pending clicks to the server first so the transaction has the correct balance
      await gameEngine.sync();

      const userRef = doc(db, 'users', user.uid);
      
      // Use a transaction to ensure atomic purchase and prevent negative balance
      const cost = await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) {
          throw new Error("User document does not exist!");
        }

        const userData = userDoc.data();
        const currentVal = userData[upgrade.type] || (upgrade.type === 'clickPower' ? 1 : 0);
        const nextLevel = Math.floor(currentVal / upgrade.value) + 1;
        const upgradeCost = Math.floor(upgrade.baseCost * Math.pow(1.15, nextLevel - 1));
        const currentBalance = userData.balance || 0;

        if (currentBalance < upgradeCost) {
          throw new Error("Insufficient balance");
        }

        transaction.update(userRef, {
          [upgrade.type]: currentVal + upgrade.value,
          balance: currentBalance - upgradeCost
        });

        return upgradeCost;
      });

      // Update local balance by subtracting the exact cost, preserving any clicks made during the transaction
      setLocalBalance(prev => prev - cost);
      
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
      // Do not reset localBalance here, as it might erase unflushed clicks
    } finally {
      setBuying(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl overflow-hidden border-4 border-blue-900 shadow-xl">
      <div className="bg-red-600 p-3 sm:p-4 border-b-4 border-red-800">
        <h3 className="text-xl font-display text-white text-center tracking-wide">Upgrades</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 bg-slate-100">
        {UPGRADES.map((upgrade) => {
          const currentVal = profile[upgrade.type] || (upgrade.type === 'clickPower' ? 1 : 0);
          const nextLevel = Math.floor(currentVal / upgrade.value) + 1;
          const cost = Math.floor(upgrade.baseCost * Math.pow(1.15, nextLevel - 1));
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
