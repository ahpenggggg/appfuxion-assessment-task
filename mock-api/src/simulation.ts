import type {
  Campaign, CampaignMetrics, Channel, CreateCampaignFields, ErrorBreakdownItem, MetricPoint,
} from '../../shared/contracts';
import { log } from './logger';

export const SIM_SPEED = Number(process.env.SIM_SPEED ?? 10);
const LANE_LIMIT_PER_MIN = 100;
const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 5_000;

const ERRORS = {
  PROVIDER_TIMEOUT: { label: 'Provider timeout', retryable: true },
  PROVIDER_5XX: { label: 'Provider server error', retryable: true },
  RATE_LIMITED: { label: 'Rate limited by provider', retryable: true },
  INVALID_RECIPIENT: { label: 'Invalid recipient', retryable: false },
  BLOCKED_BY_CARRIER: { label: 'Blocked by carrier', retryable: false },
} as const;
type ErrorCode = keyof typeof ERRORS;

interface RetryItem { dueAt: number; attempts: number }

interface SimState {
  campaign: Campaign;
  failProb: number;
  permanentShare: number;
  retries: RetryItem[];
  buckets: Map<number, { sent: number; failed: number }>; // key = minute epoch ms
  errors: Map<ErrorCode, number>;
}

const campaigns = new Map<string, SimState>();
let seq = 1000;

const iso = (ms: number) => new Date(ms).toISOString();
const minuteKey = (ms: number) => Math.floor(ms / 60_000) * 60_000;

export function nextId(): string {
  seq += 1;
  return `cmp_${seq}`;
}

export interface CreateOptions {
  id?: string;
  createdAtMs?: number;
  failProb?: number;
  permanentShare?: number;
}

export function createCampaign(fields: CreateCampaignFields, totalRecipients: number, opts: CreateOptions = {}): Campaign {
  const now = opts.createdAtMs ?? Date.now();
  const scheduledMs = fields.scheduledAt ? Date.parse(fields.scheduledAt) : null;
  const campaign: Campaign = {
    id: opts.id ?? nextId(),
    tenantId: fields.tenantId,
    name: fields.name,
    channel: fields.channel,
    messageTemplate: fields.messageTemplate,
    scheduledAt: fields.scheduledAt,
    status: scheduledMs && scheduledMs > now ? 'SCHEDULED' : 'RUNNING',
    totalRecipients,
    sentCount: 0,
    failedCount: 0,
    pendingCount: totalRecipients,
    retryQueueSize: 0,
    createdAt: iso(now),
    updatedAt: iso(now),
  };
  campaigns.set(campaign.id, {
    campaign,
    failProb: opts.failProb ?? 0.15 + Math.random() * 0.1,
    permanentShare: opts.permanentShare ?? 0.3,
    retries: [],
    buckets: new Map(),
    errors: new Map(),
  });
  log.info('campaign.created', { tenantId: campaign.tenantId, campaignId: campaign.id, status: campaign.status, totalRecipients });
  return campaign;
}

function pickError(s: SimState): ErrorCode {
  if (Math.random() < s.permanentShare) return Math.random() < 0.7 ? 'INVALID_RECIPIENT' : 'BLOCKED_BY_CARRIER';
  const r = Math.random();
  return r < 0.5 ? 'PROVIDER_TIMEOUT' : r < 0.85 ? 'PROVIDER_5XX' : 'RATE_LIMITED';
}

function attempt(s: SimState, now: number, attemptsSoFar: number) {
  const c = s.campaign;
  const bucket = s.buckets.get(minuteKey(now)) ?? { sent: 0, failed: 0 };
  s.buckets.set(minuteKey(now), bucket);

  if (Math.random() >= s.failProb) {
    c.sentCount += 1;
    bucket.sent += 1;
    return;
  }
  const code = pickError(s);
  s.errors.set(code, (s.errors.get(code) ?? 0) + 1);
  const attempts = attemptsSoFar + 1;
  if (ERRORS[code].retryable && attempts < MAX_ATTEMPTS) {
    const backoff = (BASE_BACKOFF_MS * 2 ** (attempts - 1)) / SIM_SPEED;
    s.retries.push({ dueAt: now + backoff * (0.5 + Math.random() * 0.5), attempts });
  } else {
    c.failedCount += 1;
    bucket.failed += 1;
  }
}

export function tick(now: number, elapsedMs: number) {
  const budgetPerLane = (LANE_LIMIT_PER_MIN * SIM_SPEED * elapsedMs) / 60_000;

  for (const s of campaigns.values()) {
    const c = s.campaign;
    if (c.status === 'SCHEDULED' && c.scheduledAt && Date.parse(c.scheduledAt) <= now) {
      c.status = 'RUNNING';
      c.updatedAt = iso(now);
      log.info('campaign.started', { tenantId: c.tenantId, campaignId: c.id, status: c.status });
    }
  }

  for (const channel of ['EMAIL', 'SMS', 'PUSH'] as Channel[]) {
    const running = [...campaigns.values()].filter((s) => s.campaign.channel === channel && s.campaign.status === 'RUNNING');
    if (!running.length) continue;
    let budget = Math.floor(budgetPerLane + Math.random()); // carry fractional budget statistically
    let idle = 0;
    while (budget > 0 && idle < running.length) {
      idle = 0;
      for (const s of running) {
        if (budget <= 0) break;
        const due = s.retries.findIndex((r) => r.dueAt <= now);
        if (due >= 0) {
          const [r] = s.retries.splice(due, 1);
          attempt(s, now, r.attempts);
          budget -= 1;
        } else if (s.campaign.pendingCount > 0) {
          s.campaign.pendingCount -= 1;
          attempt(s, now, 0);
          budget -= 1;
        } else {
          idle += 1;
        }
      }
    }
  }

  for (const s of campaigns.values()) {
    const c = s.campaign;
    if (c.status !== 'RUNNING') continue;
    c.retryQueueSize = s.retries.length;
    c.updatedAt = iso(now);
    if (c.pendingCount === 0 && s.retries.length === 0) {
      const attempted = c.sentCount + c.failedCount;
      c.status = attempted > 0 && c.failedCount / attempted > 0.5 ? 'FAILED' : 'COMPLETED';
      log.info('campaign.finished', { tenantId: c.tenantId, campaignId: c.id, status: c.status, sent: c.sentCount, failed: c.failedCount });
    }
  }
}

export function fastForward(fromMs: number, toMs: number) {
  for (let t = fromMs; t <= toMs; t += 1000) tick(t, 1000);
}

export function getCampaign(id: string): Campaign | undefined {
  return campaigns.get(id)?.campaign;
}

export function allCampaigns(): Campaign[] {
  return [...campaigns.values()].map((s) => s.campaign);
}

export function getMetrics(id: string): CampaignMetrics | undefined {
  const s = campaigns.get(id);
  if (!s) return undefined;
  const keys = [...s.buckets.keys()].sort((a, b) => a - b);
  const series: MetricPoint[] = [];
  let cumSent = 0;
  let cumFailed = 0;
  if (keys.length) {
    for (let k = keys[0]; k <= keys[keys.length - 1]; k += 60_000) {
      const b = s.buckets.get(k) ?? { sent: 0, failed: 0 };
      cumSent += b.sent;
      cumFailed += b.failed;
      const total = cumSent + cumFailed;
      series.push({ minute: iso(k), sent: b.sent, failed: b.failed, deliveryRate: total ? cumSent / total : 1 });
    }
  }
  const last = series.slice(-5);
  const throughputPerMinute = last.length ? Math.round(last.reduce((a, p) => a + p.sent + p.failed, 0) / last.length) : 0;
  const errorBreakdown: ErrorBreakdownItem[] = [...s.errors.entries()]
    .map(([code, count]) => ({ code, label: ERRORS[code].label, count }))
    .sort((a, b) => b.count - a.count);
  return { campaignId: id, series: series.slice(-60), throughputPerMinute, errorBreakdown, retryQueueSize: s.retries.length };
}

export function retryFailures(id: string, now = Date.now()): Campaign | undefined {
  const s = campaigns.get(id);
  if (!s) return undefined;
  const c = s.campaign;
  const n = c.failedCount;
  if (n === 0) return c;
  for (let i = 0; i < n; i += 1) s.retries.push({ dueAt: now, attempts: 0 });
  c.failedCount = 0;
  c.retryQueueSize = s.retries.length;
  c.status = 'RUNNING';
  c.updatedAt = iso(now);
  log.info('campaign.retry_failures', { tenantId: c.tenantId, campaignId: c.id, retryCount: n, status: c.status });
  return c;
}

export function resetForTests() {
  campaigns.clear();
}
