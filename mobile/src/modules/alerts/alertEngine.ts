import type { Campaign } from '@shared/contracts';
import { classify } from '@core/health';
import { config } from '@core/config';

export interface AlertDecision {
  notify: Campaign[];
  rearm: string[];
}

// Re-arm only below rearmThreshold so a rate hovering around the threshold doesn't alert repeatedly.
export function evaluateAlerts(campaigns: Campaign[], alerted: ReadonlySet<string>, rules = config.health): AlertDecision {
  const notify: Campaign[] = [];
  const rearm: string[] = [];
  for (const c of campaigns) {
    const h = classify(c, rules);
    if (h.state === 'HIGH_FAILURE' && !alerted.has(c.id)) notify.push(c);
    else if (alerted.has(c.id) && h.failureRate < rules.rearmThreshold) rearm.push(c.id);
  }
  return { notify, rearm };
}
