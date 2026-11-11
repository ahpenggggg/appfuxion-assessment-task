import { useEffect, useState } from 'react';
import type { Campaign } from '@shared/contracts';
import { fetchCampaign } from '@core/api/client';
import { sqliteCampaignCache } from '@core/db/repositories';
import { classify } from '@core/health';
import { config } from '@core/config';
import { selectIsOffline, useHealthStore } from '../store/healthStore';
import { useFocusedPolling } from './usePolling';

export function useCampaignDetailViewModel(id: string) {
  const fromList = useHealthStore((s) => s.campaigns.find((c) => c.id === id) ?? null);
  const [campaign, setCampaign] = useState<Campaign | null>(fromList);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (campaign) return;
    sqliteCampaignCache.get(id).then((c) => { if (c) setCampaign((prev) => prev ?? c); }).catch(() => {});
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useFocusedPolling(async () => {
    if (useHealthStore.getState().deviceOffline) return;
    try {
      const { data, serverTime } = await fetchCampaign(id);
      setCampaign(data);
      setError(null);
      useHealthStore.setState({ serverUnreachable: false });
      sqliteCampaignCache.upsert(data, serverTime).catch(() => {});
    } catch (e) {
      const kind = (e as { kind?: string }).kind;
      if (kind === 'not-found') setNotFound(true);
      else setError((e as Error).message);
    }
  }, () => config.sync.pollMs);

  return {
    campaign,
    health: campaign ? classify(campaign) : null,
    error,
    notFound,
    isOffline: useHealthStore(selectIsOffline),
  };
}
