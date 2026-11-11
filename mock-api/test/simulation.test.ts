import { beforeEach, describe, expect, it } from 'vitest';
import { createCampaign, getCampaign, getMetrics, resetForTests, retryFailures, tick, SIM_SPEED } from '../src/simulation';

const fields = { tenantId: 't1', name: 'n', channel: 'SMS' as const, messageTemplate: 'hi', scheduledAt: null };

describe('simulation', () => {
  beforeEach(() => resetForTests());

  it('never exceeds the per-channel rate limit', () => {
    const a = createCampaign(fields, 100_000, { createdAtMs: 0, failProb: 0 });
    const b = createCampaign(fields, 100_000, { createdAtMs: 0, failProb: 0 });
    for (let t = 1000; t <= 60_000; t += 1000) tick(t, 1000);
    const sent = getCampaign(a.id)!.sentCount + getCampaign(b.id)!.sentCount;
    expect(sent).toBeLessThanOrEqual(100 * SIM_SPEED + 60);
    expect(Math.abs(getCampaign(a.id)!.sentCount - getCampaign(b.id)!.sentCount)).toBeLessThan(sent * 0.1);
  });

  it('keeps the totals consistent and completes', () => {
    const c = createCampaign(fields, 500, { createdAtMs: 0 });
    for (let t = 1000; t <= 10 * 60_000; t += 1000) tick(t, 1000);
    const done = getCampaign(c.id)!;
    expect(done.sentCount + done.failedCount).toBe(500);
    expect(['COMPLETED', 'FAILED']).toContain(done.status);
    expect(getMetrics(c.id)!.series.length).toBeGreaterThan(0);
  });

  it('starts scheduled campaigns only when due', () => {
    const c = createCampaign({ ...fields, scheduledAt: new Date(30_000).toISOString() }, 10_000, { createdAtMs: 0 });
    tick(10_000, 1000);
    expect(getCampaign(c.id)!.status).toBe('SCHEDULED');
    tick(31_000, 1000);
    expect(getCampaign(c.id)!.status).toBe('RUNNING');
  });

  it('retry-failures moves failed messages back into the queue', () => {
    const c = createCampaign(fields, 200, { createdAtMs: 0, failProb: 1, permanentShare: 1 });
    for (let t = 1000; t <= 60_000; t += 1000) tick(t, 1000);
    expect(getCampaign(c.id)!.failedCount).toBe(200);
    const r = retryFailures(c.id, 60_000)!;
    expect(r.failedCount).toBe(0);
    expect(r.retryQueueSize).toBe(200);
    expect(r.status).toBe('RUNNING');
  });
});
