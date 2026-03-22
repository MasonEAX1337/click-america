import { doc, writeBatch, increment, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

// Constants
export const MIN_SYNC_INTERVAL_MS = 3000; // Fast sync when active
export const MAX_SYNC_INTERVAL_MS = 15000; // Slow sync when idle
export const MAX_RETRY_DELAY_MS = 30000;

class GameEngine {
  private localClicks: number = 0;
  private syncTimer: number | null = null;
  private userId: string | null = null;
  private userState: string | null = null;
  private isSyncing: boolean = false;
  private lastClickTime: number = Date.now();
  private retryDelay: number = MIN_SYNC_INTERVAL_MS;

  init(userId: string, userState: string) {
    this.userId = userId;
    this.userState = userState;
    this.scheduleNextSync(MIN_SYNC_INTERVAL_MS);
  }

  private scheduleNextSync(delay: number) {
    if (this.syncTimer) {
      window.clearTimeout(this.syncTimer);
    }
    this.syncTimer = window.setTimeout(() => this.sync(), delay);
  }

  addClick(amount: number = 1, isManual: boolean = false) {
    this.localClicks += amount;
    if (isManual) {
      this.lastClickTime = Date.now();
    }
  }

  async sync() {
    if (this.isSyncing) return;
    
    // Determine next sync interval based on activity
    const timeSinceLastClick = Date.now() - this.lastClickTime;
    const nextInterval = timeSinceLastClick > 10000 ? MAX_SYNC_INTERVAL_MS : MIN_SYNC_INTERVAL_MS;

    if (this.localClicks === 0 || !this.userId || !this.userState) {
      this.scheduleNextSync(nextInterval);
      return;
    }

    this.isSyncing = true;
    const clicksToSync = this.localClicks;
    this.localClicks = 0; // Reset local counter immediately to capture new clicks during sync

    try {
      const batch = writeBatch(db);

      // Update User
      const userRef = doc(db, 'users', this.userId);
      batch.update(userRef, {
        totalClicks: increment(clicksToSync),
        balance: increment(clicksToSync),
        lastActive: Date.now()
      });

      // Update State
      const stateRef = doc(db, 'states', this.userState);
      batch.set(stateRef, {
        name: this.userState,
        totalClicks: increment(clicksToSync)
      }, { merge: true });

      // Update Global
      const globalRef = doc(db, 'global', 'stats');
      batch.set(globalRef, {
        totalClicks: increment(clicksToSync)
      }, { merge: true });

      await batch.commit();
      
      // Reset retry delay on success
      this.retryDelay = MIN_SYNC_INTERVAL_MS;
      this.scheduleNextSync(nextInterval);
    } catch (error) {
      console.error("Failed to sync clicks, retrying later:", error);
      // Revert local clicks if sync failed
      this.localClicks += clicksToSync;
      
      // Exponential backoff for retries
      this.retryDelay = Math.min(this.retryDelay * 2, MAX_RETRY_DELAY_MS);
      this.scheduleNextSync(this.retryDelay);
    } finally {
      this.isSyncing = false;
    }
  }

  cleanup() {
    if (this.syncTimer) {
      window.clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }
    if (this.localClicks > 0) {
      this.sync(); // Attempt final sync on cleanup
    }
  }
}

export const gameEngine = new GameEngine();
