import { create } from 'zustand';
import type { Campaign, CreateCampaignFields, RowError } from '@shared/contracts';
import { createCampaign } from '@/lib/api';

type Phase = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

interface CreateCampaignState {
  phase: Phase;
  progress: number;
  error: string | null;
  serverRowErrors: RowError[];
  created: Campaign | null;
  // Reused across retries of the same submission so the server never creates it twice.
  idempotencyKey: string;
  submit: (fields: CreateCampaignFields, file: File) => Promise<Campaign | null>;
  reset: () => void;
}

const newKey = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`);

export const useCreateCampaignStore = create<CreateCampaignState>((set, get) => ({
  phase: 'idle',
  progress: 0,
  error: null,
  serverRowErrors: [],
  created: null,
  idempotencyKey: newKey(),

  submit: async (fields, file) => {
    if (get().phase === 'uploading' || get().phase === 'processing') return null;
    set({ phase: 'uploading', progress: 0, error: null, serverRowErrors: [] });
    try {
      const created = await createCampaign(fields, file, get().idempotencyKey, (p) => {
        set({ progress: p, phase: p >= 1 ? 'processing' : 'uploading' });
      });
      set({ phase: 'success', created, progress: 1, idempotencyKey: newKey() });
      return created;
    } catch (e) {
      const err = e as Error & { rowErrors?: RowError[] };
      set({ phase: 'error', error: err.message, serverRowErrors: err.rowErrors ?? [] });
      return null;
    }
  },

  reset: () => {
    if (get().phase === 'uploading' || get().phase === 'processing') return;
    set({ phase: 'idle', progress: 0, error: null, serverRowErrors: [], created: null, idempotencyKey: newKey() });
  },
}));
