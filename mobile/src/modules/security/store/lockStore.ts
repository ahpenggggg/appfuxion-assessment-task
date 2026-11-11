import { create } from 'zustand';
import { config } from '@core/config';

interface LockState {
  locked: boolean;
  backgroundedAt: number | null;
  unlock: () => void;
  onBackground: (now: number) => void;
  onForeground: (now: number) => void;
}

export function shouldRelock(backgroundedAt: number | null, now: number, limitMs: number = config.security.relockAfterMs): boolean {
  return backgroundedAt !== null && now - backgroundedAt > limitMs;
}

export const useLockStore = create<LockState>((set, get) => ({
  locked: true,
  backgroundedAt: null,
  unlock: () => set({ locked: false, backgroundedAt: null }),
  onBackground: (now) => { if (!get().locked) set({ backgroundedAt: now }); },
  onForeground: (now) => {
    if (shouldRelock(get().backgroundedAt, now)) set({ locked: true });
    set({ backgroundedAt: null });
  },
}));
