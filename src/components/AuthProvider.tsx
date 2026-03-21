import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot, increment, writeBatch } from 'firebase/firestore';

interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  state: string;
  totalClicks: number;
  balance: number;
  clicksPerSecond: number;
  clickPower: number;
  achievements?: string[];
  participatedEvents?: string[];
  lastActive?: any; // Firestore Timestamp
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logOut: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [offlineEarnings, setOfflineEarnings] = useState<number | null>(null);
  const hasCalculatedOfflineProgress = React.useRef(false);

  useEffect(() => {
    let profileUnsub: (() => void) | null = null;

    const authUnsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (profileUnsub) {
        profileUnsub();
        profileUnsub = null;
      }

      setUser(firebaseUser);
      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        
        // Use onSnapshot to keep profile in sync with upgrades and server changes
        profileUnsub = onSnapshot(userRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            let needsUpdate = false;
            
            // Calculate offline progress ONCE per session
            if (!hasCalculatedOfflineProgress.current && data.lastActive && data.clicksPerSecond > 0) {
              hasCalculatedOfflineProgress.current = true;
              const lastActiveMs = data.lastActive.toMillis ? data.lastActive.toMillis() : Date.now();
              const nowMs = Date.now();
              const diffSeconds = Math.floor((nowMs - lastActiveMs) / 1000);
              
              // Only award if offline for more than 1 minute, max 24 hours
              if (diffSeconds > 60) {
                const cappedSeconds = Math.min(diffSeconds, 86400); // Max 24 hours of offline progress
                // Apply 90% loss (10% efficiency) to offline passive clicks
                const calculatedClicks = Math.floor(cappedSeconds * data.clicksPerSecond * 0.10);
                const earnedClicks = Math.min(calculatedClicks, 100000); // Cap at 100k to comply with anti-cheat rules
                
                if (earnedClicks > 0) {
                  setOfflineEarnings(earnedClicks);
                  
                  // Update user and global stats with offline earnings
                  try {
                    const batch = writeBatch(db);
                    batch.update(userRef, {
                      totalClicks: increment(earnedClicks),
                      balance: increment(earnedClicks),
                      lastActive: serverTimestamp()
                    });
                    
                    const stateRef = doc(db, 'states', data.state);
                    batch.set(stateRef, {
                      name: data.state,
                      totalClicks: increment(earnedClicks)
                    }, { merge: true });
                    
                    const globalRef = doc(db, 'global', 'stats');
                    batch.set(globalRef, {
                      totalClicks: increment(earnedClicks)
                    }, { merge: true });
                    
                    await batch.commit();
                    
                    // Update local data immediately for UI
                    data.totalClicks += earnedClicks;
                    data.balance += earnedClicks;
                  } catch (e) {
                    console.error("Failed to award offline progress:", e);
                  }
                }
              }
            }

            if (data.balance === undefined) {
              data.balance = data.totalClicks;
              needsUpdate = true;
            }
            if (data.achievements === undefined) {
              data.achievements = [];
              needsUpdate = true;
            }
            if (data.participatedEvents === undefined) {
              data.participatedEvents = [];
              needsUpdate = true;
            }
            if (needsUpdate) {
              setDoc(userRef, { balance: data.balance, achievements: data.achievements, participatedEvents: data.participatedEvents }, { merge: true });
            }
            setProfile(data);
          } else {
            setProfile(null);
          }
        });
      } else {
        setProfile(null);
        if (profileUnsub) {
          profileUnsub();
          profileUnsub = null;
        }
      }
      setLoading(false);
    });

    return () => {
      authUnsub();
      if (profileUnsub) profileUnsub();
    };
  }, []);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logOut = async () => {
    await signOut(auth);
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    
    if (!profile) {
      // First time setup
      const newProfile: UserProfile = {
        uid: user.uid,
        displayName: user.displayName || 'Anonymous',
        photoURL: user.photoURL || '',
        state: data.state || 'CA',
        totalClicks: 0,
        balance: 0,
        clicksPerSecond: 0,
        clickPower: 1,
        achievements: [],
        participatedEvents: [],
      };
      await setDoc(userRef, {
        ...newProfile,
        lastActive: serverTimestamp(),
        createdAt: serverTimestamp()
      });
      setProfile(newProfile);
    } else {
      // Update existing
      await setDoc(userRef, { ...data, lastActive: serverTimestamp() }, { merge: true });
      setProfile({ ...profile, ...data });
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, logOut, updateProfile }}>
      {children}
      {offlineEarnings !== null && offlineEarnings > 0 && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white p-4 rounded-xl shadow-2xl border-2 border-white z-50 animate-in slide-in-from-bottom-5 fade-in duration-500 font-nunito font-bold">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-400 text-blue-900 rounded-full p-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <div>
              <p className="text-sm text-blue-100 uppercase tracking-wider">While you were away</p>
              <p className="text-xl font-lilita text-yellow-300">+{offlineEarnings.toLocaleString()} Clicks!</p>
            </div>
            <button 
              onClick={() => setOfflineEarnings(null)}
              className="ml-4 text-white/70 hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
