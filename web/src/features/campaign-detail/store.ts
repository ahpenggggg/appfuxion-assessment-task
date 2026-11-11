import { create } from 'zustand';
import type { Campaign, CampaignMetrics } from '@shared/contracts';
import { getCampaign, getCampaignMetrics, retryFailures } from '@/lib/api';

interface CampaignDetailState {
  id: string | null;
  campaign: Campaign | null;
  metrics: CampaignMetrics | null;
  state: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  notFound: boolean;
  lastUpdated: number | null;
  retrying: boolean;
  load: (id: string, opts?: { background?: boolean }) => Promise<void>;
  retryFailed: () => Promise<string | null>;
}

export const useCampaignDetailStore = create<CampaignDetailState>((set, get) => ({
  id: null,
  campaign: null,
  metrics: null,
  state: 'idle',
  error: null,
  notFound: false,
  lastUpdated: null,
  retrying: false,

  load: async (id, opts = {}) => {
    if (get().id !== id) set({ id, campaign: null, metrics: null, notFound: false });
    if (!opts.background) set({ state: 'loading', error: null });
    try {
      const [campaign, metrics] = await Promise.all([getCampaign(id), getCampaignMetrics(id)]);
      if (get().id !== id) return;
      set({ campaign, metrics, state: 'ready', error: null, lastUpdated: Date.now() });
    } catch (e) {
      if (get().id !== id) return;
      const status = (e as { status?: number }).status;
      if (status === 404) return set({ state: 'error', notFound: true, error: (e as Error).message });
      if (opts.background && get().campaign) set({ error: (e as Error).message });
      else set({ state: 'error', error: (e as Error).message });
    }
  },

  retryFailed: async () => {
    const id = get().id;
    if (!id) return null;
    set({ retrying: true });
    try {
      const campaign = await retryFailures(id);
      set({ campaign, retrying: false });
      await get().load(id, { background: true });
      return null;
    } catch (e) {
      set({ retrying: false });
      return (e as Error).message;
    }
  },
}));
