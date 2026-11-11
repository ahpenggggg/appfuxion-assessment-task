import { create } from 'zustand';
import type { Campaign, CampaignListQuery, Paginated } from '@shared/contracts';
import { listCampaigns, listTenants } from '@/lib/api';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

interface CampaignListState {
  data: Paginated<Campaign> | null;
  state: LoadState;
  error: string | null;
  lastUpdated: number | null;
  tenants: string[];
  queryKey: string;
  fetch: (q: CampaignListQuery, opts?: { background?: boolean }) => Promise<void>;
  loadTenants: () => Promise<void>;
}

let controller: AbortController | null = null;

export const useCampaignListStore = create<CampaignListState>((set, get) => ({
  data: null,
  state: 'idle',
  error: null,
  lastUpdated: null,
  tenants: [],
  queryKey: '',

  fetch: async (q, opts = {}) => {
    const key = JSON.stringify(q);
    const changedQuery = key !== get().queryKey;
    // Background polls keep the current table on screen; a new query shows the skeleton.
    if (!opts.background || changedQuery) set({ state: 'loading', queryKey: key, ...(changedQuery ? { data: null } : {}) });
    controller?.abort();
    const ctrl = new AbortController();
    controller = ctrl;
    try {
      const data = await listCampaigns(q, ctrl.signal);
      if (get().queryKey !== key) return;
      set({ data, state: 'ready', error: null, lastUpdated: Date.now() });
    } catch (e) {
      if (ctrl.signal.aborted) return;
      if (opts.background && get().data) set({ error: (e as Error).message });
      else set({ state: 'error', error: (e as Error).message });
    }
  },

  loadTenants: async () => {
    try { set({ tenants: await listTenants() }); } catch { /* filter falls back to free text */ }
  },
}));
