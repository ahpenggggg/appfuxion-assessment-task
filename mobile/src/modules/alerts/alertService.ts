import type { Campaign } from '@shared/contracts';
import { sqliteAlertState, type AlertStateStore } from '@core/db/repositories';
import { logger } from '@core/logger';
import { evaluateAlerts } from './alertEngine';
import { notifeeNotifier, type Notifier } from './notifier';

export async function processAlerts(
  campaigns: Campaign[],
  deps: { store: AlertStateStore; notifier: Notifier; now: number } = { store: sqliteAlertState, notifier: notifeeNotifier, now: Date.now() },
): Promise<string[]> {
  const alerted = await deps.store.alertedIds();
  const { notify, rearm } = evaluateAlerts(campaigns, alerted);
  for (const c of notify) {
    try {
      await deps.notifier.notifyHighFailure(c);
      await deps.store.setAlerted(c.id, true, deps.now); // only marked after the notification was shown
    } catch (e) {
      logger.warn('alert.failed', { campaignId: c.id, error: String(e) });
    }
  }
  for (const id of rearm) await deps.store.setAlerted(id, false, deps.now);
  return notify.map((c) => c.id);
}
