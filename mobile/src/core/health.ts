import type { Campaign } from '@shared/contracts';
import { config } from './config';

export type HealthState = 'HEALTHY' | 'HIGH_FAILURE';

export interface Health {
  state: HealthState;
  // Pending messages are excluded: they haven't been attempted yet.
  failureRate: number;
  attempted: number;
  warmingUp: boolean;
}

export function failureRate(sent: number, failed: number): number {
  const attempted = sent + failed;
  return attempted > 0 ? failed / attempted : 0;
}

export function classify(c: Pick<Campaign, 'sentCount' | 'failedCount'>, rules = config.health): Health {
  const attempted = c.sentCount + c.failedCount;
  const rate = failureRate(c.sentCount, c.failedCount);
  const warmingUp = attempted < rules.minSample;
  return {
    state: !warmingUp && rate > rules.alertThreshold ? 'HIGH_FAILURE' : 'HEALTHY',
    failureRate: rate,
    attempted,
    warmingUp,
  };
}

export function sortByHealth(items: Campaign[]): Campaign[] {
  return [...items].sort((a, b) => {
    const ha = classify(a).state === 'HIGH_FAILURE' ? 0 : 1;
    const hb = classify(b).state === 'HIGH_FAILURE' ? 0 : 1;
    return ha - hb || b.createdAt.localeCompare(a.createdAt);
  });
}
