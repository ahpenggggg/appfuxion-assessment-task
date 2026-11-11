import notifee, { AndroidImportance, AuthorizationStatus, EventType, type Event } from '@notifee/react-native';
import type { Campaign } from '@shared/contracts';
import { classify } from '@core/health';
import { pct } from '@core/time';
import { logger } from '@core/logger';

const CHANNEL_ID = 'campaign-alerts';

export interface Notifier {
  ensurePermission(): Promise<boolean>;
  notifyHighFailure(c: Campaign): Promise<void>;
}

export const notifeeNotifier: Notifier = {
  async ensurePermission() {
    const settings = await notifee.requestPermission();
    await notifee.createChannel({ id: CHANNEL_ID, name: 'Campaign alerts', importance: AndroidImportance.HIGH });
    return settings.authorizationStatus !== AuthorizationStatus.DENIED;
  },
  async notifyHighFailure(c) {
    const rate = classify(c).failureRate;
    await notifee.displayNotification({
      id: `high-failure-${c.id}`,
      title: `High failure rate: ${c.name}`,
      body: `${pct(rate)} of messages are failing (${c.channel}, ${c.tenantId}). Tap to view.`,
      data: { campaignId: c.id },
      android: { channelId: CHANNEL_ID, pressAction: { id: 'default' }, smallIcon: 'ic_launcher' },
      ios: { sound: 'default' },
    });
    logger.info('alert.sent', { campaignId: c.id, tenantId: c.tenantId, failureRate: rate });
  },
};

export function campaignIdFromEvent(e: Event): string | null {
  if (e.type !== EventType.PRESS) return null;
  const id = e.detail.notification?.data?.campaignId;
  return typeof id === 'string' ? id : null;
}

export function onAlertPressed(handler: (campaignId: string) => void): () => void {
  return notifee.onForegroundEvent((e) => {
    const id = campaignIdFromEvent(e);
    if (id) handler(id);
  });
}

// Must be registered in index.js, outside React.
export function registerBackgroundAlertHandler(handler: (campaignId: string) => void) {
  notifee.onBackgroundEvent(async (e) => {
    const id = campaignIdFromEvent(e);
    if (id) handler(id);
  });
}

export async function initialAlertCampaignId(): Promise<string | null> {
  const initial = await notifee.getInitialNotification();
  const id = initial?.notification.data?.campaignId;
  return typeof id === 'string' ? id : null;
}
