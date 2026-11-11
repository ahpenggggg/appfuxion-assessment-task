import { useEffect, useMemo, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useTranslation } from 'react-i18next';
import type { Campaign } from '@shared/contracts';
import { classify, sortByHealth, type Health } from '@core/health';
import { nextPollDelay } from '@core/backoff';
import { formatAgo } from '@core/time';
import { NavigationService } from '@app/navigationService';
import { selectIsOffline, useHealthStore } from '../store/healthStore';
import { useFocusedPolling } from './usePolling';

export interface CampaignRowModel {
  campaign: Campaign;
  health: Health;
  progress: number;
}

export interface HealthBanner {
  tone: 'warning' | 'critical' | 'neutral';
  text: string;
}

export function useCampaignHealthViewModel() {
  const { t } = useTranslation('campaignHealth');
  const s = useHealthStore();
  const [now, setNow] = useState(Date.now());

  useEffect(() => { s.hydrate(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => NetInfo.addEventListener((state) => {
    useHealthStore.getState().setDeviceOffline(state.isConnected === false);
  }), []);

  useFocusedPolling(
    () => useHealthStore.getState().sync(),
    () => nextPollDelay(useHealthStore.getState().consecutiveFailures),
  );

  const rows: CampaignRowModel[] = useMemo(
    () => sortByHealth(s.campaigns).map((c) => ({
      campaign: c,
      health: classify(c),
      progress: c.totalRecipients ? (c.sentCount + c.failedCount) / c.totalRecipients : 0,
    })),
    [s.campaigns],
  );

  const lastSynced = s.lastSyncedAt ? formatAgo(s.lastSyncedAt, now + s.clockOffsetMs) : null;

  let banner: HealthBanner | null = null;
  if (selectIsOffline(s)) banner = { tone: 'warning', text: lastSynced ? t('offlineSince', { ago: lastSynced }) : t('offlineNever') };
  else if (s.error && s.consecutiveFailures > 0) banner = { tone: 'critical', text: t('syncFailed', { message: s.error }) };

  const counts = {
    total: rows.length,
    failing: rows.filter((r) => r.health.state === 'HIGH_FAILURE').length,
  };

  return {
    rows,
    counts,
    banner,
    lastSynced,
    loading: !s.hydrated && rows.length === 0,
    refreshing: s.syncing && s.hydrated,
    hasData: rows.length > 0,
    onRefresh: () => { useHealthStore.getState().sync(); },
    onOpen: (id: string) => NavigationService.navigate('CampaignDetail', { id }),
  };
}
