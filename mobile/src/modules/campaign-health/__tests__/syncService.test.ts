import { loadCached, syncActiveCampaigns, type SyncDeps } from '../services/syncService';
import { memoryCampaignCache, memoryKv } from '@core/db/repositories';
import { ApiError } from '@core/api/client';
import { makeCampaign } from '../../../test-utils';

function deps(over: Partial<SyncDeps> = {}): SyncDeps {
  return {
    fetch: jest.fn().mockResolvedValue({ data: [makeCampaign()], serverTime: 1_000 }),
    cache: memoryCampaignCache(),
    kv: memoryKv(),
    alerts: jest.fn().mockResolvedValue([]),
    ...over,
  };
}

describe('syncActiveCampaigns', () => {
  it('saves to the cache, records the server time and runs alerts', async () => {
    const d = deps();
    await syncActiveCampaigns(d);
    expect(await loadCached(d)).toEqual({ items: [makeCampaign()], lastSyncedAt: 1_000 });
    expect(d.alerts).toHaveBeenCalledWith([makeCampaign()]);
  });

  it('keeps the previous cache when the network fails (offline support)', async () => {
    const d = deps();
    await syncActiveCampaigns(d);
    d.fetch = jest.fn().mockRejectedValue(new ApiError('offline', 'Cannot reach the server.'));
    await expect(syncActiveCampaigns(d)).rejects.toThrow('Cannot reach');
    expect((await loadCached(d)).items).toHaveLength(1);
  });

  it('drops campaigns that are no longer active', async () => {
    const d = deps();
    await syncActiveCampaigns(d);
    d.fetch = jest.fn().mockResolvedValue({ data: [makeCampaign({ id: 'other' })], serverTime: 2_000 });
    await syncActiveCampaigns(d);
    expect((await loadCached(d)).items.map((c) => c.id)).toEqual(['other']);
  });
});
