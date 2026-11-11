import { create } from 'zustand';
import type { Campaign } from '@shared/contracts';
import { ApiError } from '@core/api/client';
import { logger } from '@core/logger';
import { loadCached, syncActiveCampaigns } from '../services/syncService';

interface HealthState {
  campaigns: Campaign[];
  lastSyncedAt: number | null;
  clockOffsetMs: number;
  hydrated: boolean;
  syncing: boolean;
  error: string | null;
  consecutiveFailures: number;
  deviceOffline: boolean;
  serverUnreachable: boolean;
  hydrate: () => Promise<void>;
  sync: () => Promise<void>;
  setDeviceOffline: (offline: boolean) => void;
}

export const selectIsOffline = (s: Pick<HealthState, 'deviceOffline' | 'serverUnreachable'>) =>
  s.deviceOffline || s.serverUnreachable;

export const useHealthStore = create<HealthState>((set, get) => ({
  campaigns: [],
  lastSyncedAt: null,
  clockOffsetMs: 0,
  hydrated: false,
  syncing: false,
  error: null,
  consecutiveFailures: 0,
  deviceOffline: false,
  serverUnreachable: false,

  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const { items, lastSyncedAt } = await loadCached();
      // Don't overwrite fresher network data if a sync finished first.
      if (!get().lastSyncedAt) set({ campaigns: items, lastSyncedAt });
    } catch (e) {
      logger.warn('cache.load_failed', { error: String(e) });
    } finally {
      set({ hydrated: true });
    }
  },

  sync: async () => {
    if (get().syncing || get().deviceOffline) return;
    set({ syncing: true });
    try {
      const { items, serverTime } = await syncActiveCampaigns();
      set({ campaigns: items, lastSyncedAt: serverTime, clockOffsetMs: serverTime - Date.now(), error: null, consecutiveFailures: 0, serverUnreachable: false });
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError('server', String(e));
      set((s) => ({ error: err.message, consecutiveFailures: s.consecutiveFailures + 1, serverUnreachable: err.kind === 'offline' }));
    } finally {
      set({ syncing: false });
    }
  },

  setDeviceOffline: (offline) => {
    const wasOffline = get().deviceOffline;
    set({ deviceOffline: offline });
    if (wasOffline && !offline) get().sync();
  },
}));
