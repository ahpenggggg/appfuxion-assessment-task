import { evaluateAlerts } from '../alertEngine';
import { processAlerts } from '../alertService';
import { memoryAlertState } from '@core/db/repositories';
import { makeCampaign } from '../../../test-utils';

const failing = (rate: number, id = 'c1') => makeCampaign({ id, sentCount: Math.round(1000 * (1 - rate)), failedCount: Math.round(1000 * rate) });

describe('evaluateAlerts', () => {
  it('alerts once when a campaign crosses 20%', () => {
    expect(evaluateAlerts([failing(0.25)], new Set()).notify).toHaveLength(1);
    expect(evaluateAlerts([failing(0.25)], new Set(['c1'])).notify).toHaveLength(0);
  });

  it('does not re-arm between 18% and 20% (no flapping)', () => {
    expect(evaluateAlerts([failing(0.19)], new Set(['c1'])).rearm).toEqual([]);
  });

  it('re-arms below 18%', () => {
    expect(evaluateAlerts([failing(0.15)], new Set(['c1'])).rearm).toEqual(['c1']);
  });

  it('ignores campaigns below the minimum sample', () => {
    const tiny = makeCampaign({ sentCount: 1, failedCount: 9 });
    expect(evaluateAlerts([tiny], new Set()).notify).toHaveLength(0);
  });
});

describe('processAlerts', () => {
  it('notifies, remembers, and does not notify again on the next sync', async () => {
    const store = memoryAlertState();
    const notifier = { ensurePermission: jest.fn(), notifyHighFailure: jest.fn().mockResolvedValue(undefined) };
    await processAlerts([failing(0.3)], { store, notifier, now: 1 });
    await processAlerts([failing(0.31)], { store, notifier, now: 2 });
    expect(notifier.notifyHighFailure).toHaveBeenCalledTimes(1);
  });

  it('does not mark as alerted if showing the notification failed, so it retries next sync', async () => {
    const store = memoryAlertState();
    const notifier = { ensurePermission: jest.fn(), notifyHighFailure: jest.fn().mockRejectedValueOnce(new Error('denied')).mockResolvedValue(undefined) };
    await processAlerts([failing(0.3)], { store, notifier, now: 1 });
    expect(await store.alertedIds()).toEqual(new Set());
    await processAlerts([failing(0.3)], { store, notifier, now: 2 });
    expect(await store.alertedIds()).toEqual(new Set(['c1']));
  });
});
