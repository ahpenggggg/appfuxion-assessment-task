import type { Campaign, CampaignStatus, Channel, Paginated } from '@shared/contracts';

export class DecodeError extends Error {
  constructor(public path: string, expected: string) {
    super(`Invalid response at ${path}: expected ${expected}`);
    this.name = 'DecodeError';
  }
}

type Obj = Record<string, unknown>;

const obj = (v: unknown, path: string): Obj => {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new DecodeError(path, 'object');
  return v as Obj;
};
const str = (o: Obj, k: string, path: string): string => {
  if (typeof o[k] !== 'string') throw new DecodeError(`${path}.${k}`, 'string');
  return o[k] as string;
};
const num = (o: Obj, k: string, path: string): number => {
  const v = o[k];
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) throw new DecodeError(`${path}.${k}`, 'non-negative number');
  return v;
};
const nullableStr = (o: Obj, k: string, path: string): string | null =>
  o[k] === null || o[k] === undefined ? null : str(o, k, path);
function oneOf<T extends string>(o: Obj, k: string, allowed: readonly T[], path: string): T {
  const v = str(o, k, path);
  if (!allowed.includes(v as T)) throw new DecodeError(`${path}.${k}`, allowed.join(' | '));
  return v as T;
}

const CHANNELS: readonly Channel[] = ['EMAIL', 'SMS', 'PUSH'];
const STATUSES: readonly CampaignStatus[] = ['SCHEDULED', 'RUNNING', 'COMPLETED', 'FAILED'];

export function decodeCampaign(v: unknown, path = 'campaign'): Campaign {
  const o = obj(v, path);
  return {
    id: str(o, 'id', path),
    tenantId: str(o, 'tenantId', path),
    name: str(o, 'name', path),
    channel: oneOf(o, 'channel', CHANNELS, path),
    messageTemplate: str(o, 'messageTemplate', path),
    scheduledAt: nullableStr(o, 'scheduledAt', path),
    status: oneOf(o, 'status', STATUSES, path),
    totalRecipients: num(o, 'totalRecipients', path),
    sentCount: num(o, 'sentCount', path),
    failedCount: num(o, 'failedCount', path),
    pendingCount: num(o, 'pendingCount', path),
    retryQueueSize: num(o, 'retryQueueSize', path),
    createdAt: str(o, 'createdAt', path),
    updatedAt: str(o, 'updatedAt', path),
  };
}

export function decodeCampaignPage(v: unknown): Paginated<Campaign> {
  const o = obj(v, 'response');
  if (!Array.isArray(o.items)) throw new DecodeError('response.items', 'array');
  return {
    items: o.items.map((c, i) => decodeCampaign(c, `response.items[${i}]`)),
    page: num(o, 'page', 'response'),
    pageSize: num(o, 'pageSize', 'response'),
    total: num(o, 'total', 'response'),
  };
}
