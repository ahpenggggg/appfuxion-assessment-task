import type { Campaign } from '@shared/contracts';
import { fetchActiveCampaigns } from '@core/api/client';
import { sqliteCampaignCache, sqliteKv, type CampaignCache, type KeyValueStore } from '@core/db/repositories';
import { processAlerts } from '@modules/alerts';

export const LAST_SYNC_KEY = 'campaigns.lastSyncedAt';

export interface SyncDeps {
  fetch: typeof fetchActiveCampaigns;
  cache: CampaignCache;
  kv: KeyValueStore;
  alerts: (items: Campaign[]) => Promise<unknown>;
}

const defaultDeps: SyncDeps = { fetch: fetchActiveCampaigns, cache: sqliteCampaignCache, kv: sqliteKv, alerts: (i) => processAlerts(i) };

export async function syncActiveCampaigns(deps: SyncDeps = defaultDeps): Promise<{ items: Campaign[]; serverTime: number }> {
  const { data, serverTime } = await deps.fetch();
  await deps.cache.replaceActive(data, serverTime);
  await deps.kv.set(LAST_SYNC_KEY, String(serverTime));
  await deps.alerts(data);
  return { items: data, serverTime };
}

export async function loadCached(deps: Pick<SyncDeps, 'cache' | 'kv'> = defaultDeps): Promise<{ items: Campaign[]; lastSyncedAt: number | null }> {
  const [items, last] = await Promise.all([deps.cache.loadAll(), deps.kv.get(LAST_SYNC_KEY)]);
  return { items, lastSyncedAt: last ? Number(last) : null };
}
