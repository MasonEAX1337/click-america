import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

interface SoundContextType {
  isMuted: boolean;
  toggleMute: () => void;
  playClick: () => void;
  playUpgrade: () => void;
  playNotification: () => void;
}

const SoundContext = createContext<SoundContextType | null>(null);

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [isMuted, setIsMuted] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
  };

  const playTone = useCallback((frequency: number, type: OscillatorType, duration: number, vol: number = 0.1) => {
    if (isMuted) return;
    try {
      initAudio();
      const ctx = audioCtxRef.current;
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);

      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.error("Audio playback failed", e);
    }
  }, [isMuted]);

  const playClick = useCallback(() => {
    playTone(800, 'sine', 0.05, 0.02); // Very short, subtle pop
  }, [playTone]);

  const playUpgrade = useCallback(() => {
    if (isMuted) return;
    playTone(523.25, 'sine', 0.1, 0.05); // C5
    setTimeout(() => playTone(659.25, 'sine', 0.1, 0.05), 100); // E5
    setTimeout(() => playTone(783.99, 'sine', 0.2, 0.05), 200); // G5
  }, [playTone, isMuted]);

  const playNotification = useCallback(() => {
    playTone(1046.50, 'sine', 0.15, 0.015); // C6, very soft ping
  }, [playTone]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  return (
    <SoundContext.Provider value={{ isMuted, toggleMute, playClick, playUpgrade, playNotification }}>
      {children}
    </SoundContext.Provider>
  );
}

export const useSound = () => {
  const context = useContext(SoundContext);
  if (!context) throw new Error('useSound must be used within a SoundProvider');
  return context;
};
