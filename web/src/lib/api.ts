import axios, { AxiosError } from 'axios';
import type {
  ApiErrorBody, Campaign, CampaignListQuery, CampaignMetrics, CreateCampaignFields, Paginated, RowError,
} from '@shared/contracts';

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export const http = axios.create({ baseURL: API_URL, timeout: 15_000 });

export class ApiError extends Error {
  status?: number;
  rowErrors?: RowError[];
  constructor(message: string, status?: number, rowErrors?: RowError[]) {
    super(message);
    this.status = status;
    this.rowErrors = rowErrors;
  }
}

export function toApiError(e: unknown): ApiError {
  if (e instanceof ApiError) return e;
  if (e instanceof AxiosError) {
    const body = e.response?.data as Partial<ApiErrorBody> | undefined;
    if (body?.error?.message) return new ApiError(body.error.message, e.response?.status, body.error.rowErrors);
    if (e.code === 'ECONNABORTED') return new ApiError('The server took too long to respond.', e.response?.status);
    if (!e.response) return new ApiError('Cannot reach the server. Check your connection and that the API is running.');
    return new ApiError(`Request failed (${e.response.status}).`, e.response.status);
  }
  return new ApiError(e instanceof Error ? e.message : 'Something went wrong.');
}

function isCampaign(v: unknown): v is Campaign {
  const c = v as Campaign;
  return !!c && typeof c.id === 'string' && typeof c.sentCount === 'number' && typeof c.totalRecipients === 'number' && typeof c.status === 'string';
}
function assert<T>(ok: boolean, value: T, what: string): T {
  if (!ok) throw new ApiError(`Unexpected response from server (${what}).`);
  return value;
}

export async function listCampaigns(q: CampaignListQuery, signal?: AbortSignal): Promise<Paginated<Campaign>> {
  const params = Object.fromEntries(Object.entries(q).filter(([, v]) => v !== undefined && v !== ''));
  try {
    const { data } = await http.get<Paginated<Campaign>>('/campaigns', { params, signal });
    return assert(Array.isArray(data?.items) && data.items.every(isCampaign) && typeof data.total === 'number', data, 'campaign list');
  } catch (e) { throw toApiError(e); }
}

export async function listTenants(): Promise<string[]> {
  try {
    const { data } = await http.get<{ items: string[] }>('/tenants');
    return assert(Array.isArray(data?.items), data.items, 'tenants');
  } catch (e) { throw toApiError(e); }
}

export async function getCampaign(id: string, signal?: AbortSignal): Promise<Campaign> {
  try {
    const { data } = await http.get<Campaign>(`/campaigns/${encodeURIComponent(id)}`, { signal });
    return assert(isCampaign(data), data, 'campaign');
  } catch (e) { throw toApiError(e); }
}

export async function getCampaignMetrics(id: string, signal?: AbortSignal): Promise<CampaignMetrics> {
  try {
    const { data } = await http.get<CampaignMetrics>(`/campaigns/${encodeURIComponent(id)}/metrics`, { signal });
    return assert(Array.isArray(data?.series) && Array.isArray(data.errorBreakdown), data, 'metrics');
  } catch (e) { throw toApiError(e); }
}

export async function retryFailures(id: string): Promise<Campaign> {
  try {
    const { data } = await http.post<Campaign>(`/campaigns/${encodeURIComponent(id)}/retry-failures`);
    return data;
  } catch (e) { throw toApiError(e); }
}

export async function createCampaign(
  fields: CreateCampaignFields,
  file: File,
  idempotencyKey: string,
  onProgress: (fraction: number) => void,
): Promise<Campaign> {
  const form = new FormData();
  // Text fields first: the server needs the channel before it streams the CSV.
  form.append('tenantId', fields.tenantId);
  form.append('name', fields.name);
  form.append('channel', fields.channel);
  form.append('messageTemplate', fields.messageTemplate);
  form.append('scheduledAt', fields.scheduledAt ?? '');
  form.append('recipients', file);
  try {
    const { data } = await http.post<Campaign>('/campaigns', form, {
      headers: { 'Idempotency-Key': idempotencyKey },
      timeout: 0,
      onUploadProgress: (e) => onProgress(e.total ? e.loaded / e.total : 0),
    });
    return assert(isCampaign(data), data, 'created campaign');
  } catch (e) { throw toApiError(e); }
}
