import { classify, failureRate, sortByHealth } from '../health';
import { nextPollDelay } from '../backoff';
import { formatAgo } from '../time';
import { makeCampaign } from '../../test-utils';

describe('health classification', () => {
  it('excludes pending messages from the failure rate', () => {
    expect(failureRate(30, 10)).toBe(0.25);
    expect(failureRate(0, 0)).toBe(0);
  });

  it('is HIGH_FAILURE above 20% once the minimum sample is reached', () => {
    expect(classify(makeCampaign({ sentCount: 79, failedCount: 21 })).state).toBe('HIGH_FAILURE');
    expect(classify(makeCampaign({ sentCount: 80, failedCount: 20 })).state).toBe('HEALTHY');
  });

  it('does not judge a campaign before the minimum sample', () => {
    const h = classify(makeCampaign({ sentCount: 0, failedCount: 5 }));
    expect(h.failureRate).toBe(1);
    expect(h.warmingUp).toBe(true);
    expect(h.state).toBe('HEALTHY');
  });

  it('sorts failing campaigns first', () => {
    const ok = makeCampaign({ id: 'ok', sentCount: 100, createdAt: '2026-11-11T09:00:00Z' });
    const bad = makeCampaign({ id: 'bad', sentCount: 50, failedCount: 50, createdAt: '2026-11-11T08:00:00Z' });
    expect(sortByHealth([ok, bad]).map((c) => c.id)).toEqual(['bad', 'ok']);
  });
});

describe('poll backoff', () => {
  it('doubles after each failure and caps at 60 s', () => {
    expect([0, 1, 2, 3, 4].map((n) => nextPollDelay(n))).toEqual([8000, 16000, 32000, 60000, 60000]);
  });
});

describe('formatAgo', () => {
  it('formats relative times', () => {
    expect(formatAgo(0, 5_000)).toBe('just now');
    expect(formatAgo(0, 45_000)).toBe('45s ago');
    expect(formatAgo(0, 3 * 60_000)).toBe('3 min ago');
  });
});
