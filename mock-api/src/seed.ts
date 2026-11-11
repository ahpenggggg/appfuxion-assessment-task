import type { Channel, CreateCampaignFields } from '../../shared/contracts';
import { createCampaign, fastForward } from './simulation';

const MIN = 60_000;

interface Seed {
  id: string;
  tenantId: string;
  name: string;
  channel: Channel;
  total: number;
  agoMin: number;
  scheduleInMin?: number;
  failProb?: number;
  permanentShare?: number;
  template?: string;
}

const seeds: Seed[] = [
  { id: 'cmp_0001', tenantId: 'tenant-acme', name: 'Year-end promo', channel: 'EMAIL', total: 5000, agoMin: 55 },
  { id: 'cmp_0002', tenantId: 'tenant-acme', name: 'App login reminder', channel: 'PUSH', total: 800, agoMin: 48 },
  { id: 'cmp_0003', tenantId: 'tenant-initech', name: 'Card activation', channel: 'SMS', total: 600, agoMin: 45 },
  { id: 'cmp_0004', tenantId: 'tenant-umbrella', name: 'Welcome series #1', channel: 'EMAIL', total: 900, agoMin: 40, failProb: 0.8, permanentShare: 0.95 },
  { id: 'cmp_0005', tenantId: 'tenant-globex', name: 'Policy renewal notice', channel: 'EMAIL', total: 30000, agoMin: 12 },
  { id: 'cmp_0006', tenantId: 'tenant-globex', name: 'Flash sale (SMS)', channel: 'SMS', total: 12000, agoMin: 4, failProb: 0.38, permanentShare: 0.85,
    template: 'Hi {{firstName}}, 50% off today only! Reply STOP to opt out.' },
  { id: 'cmp_0007', tenantId: 'tenant-initech', name: 'App update available', channel: 'PUSH', total: 15000, agoMin: 6 },
  { id: 'cmp_0008', tenantId: 'tenant-initech', name: 'Payment due reminder', channel: 'SMS', total: 1500, agoMin: 2, scheduleInMin: 20 },
  { id: 'cmp_0009', tenantId: 'tenant-acme', name: 'Weekend newsletter', channel: 'EMAIL', total: 12000, agoMin: 1, scheduleInMin: 90 },
  { id: 'cmp_0010', tenantId: 'tenant-umbrella', name: 'Security alert', channel: 'PUSH', total: 300, agoMin: 35 },
  { id: 'cmp_0011', tenantId: 'tenant-acme', name: 'Survey invitation', channel: 'EMAIL', total: 1200, agoMin: 33 },
  { id: 'cmp_0012', tenantId: 'tenant-globex', name: 'OTP fallback test', channel: 'SMS', total: 200, agoMin: 30 },
  { id: 'cmp_0013', tenantId: 'tenant-initech', name: 'Feature launch', channel: 'PUSH', total: 2500, agoMin: 28 },
  { id: 'cmp_0014', tenantId: 'tenant-umbrella', name: 'Invoice ready', channel: 'EMAIL', total: 700, agoMin: 25 },
];

export function seed(now = Date.now()) {
  const sorted = [...seeds].sort((a, b) => b.agoMin - a.agoMin);
  const start = now - sorted[0].agoMin * MIN;
  let cursor = start;
  for (const s of sorted) {
    const createdAtMs = now - s.agoMin * MIN;
    fastForward(cursor, createdAtMs);
    cursor = createdAtMs;
    const fields: CreateCampaignFields = {
      tenantId: s.tenantId,
      name: s.name,
      channel: s.channel,
      messageTemplate: s.template ?? `Hi {{firstName}}, ${s.name.toLowerCase()} — tap to see details.`,
      scheduledAt: s.scheduleInMin ? new Date(now + s.scheduleInMin * MIN).toISOString() : null,
    };
    createCampaign(fields, s.total, { id: s.id, createdAtMs, failProb: s.failProb, permanentShare: s.permanentShare });
  }
  fastForward(cursor, now);
}
