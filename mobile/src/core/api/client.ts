import axios, { AxiosError } from 'axios';
import type { Campaign } from '@shared/contracts';
import { config } from '../config';
import { logger } from '../logger';
import { DecodeError, decodeCampaign, decodeCampaignPage } from './decoders';

const http = axios.create({ baseURL: config.apiUrl, timeout: 10_000 });

export type ApiErrorKind = 'offline' | 'timeout' | 'server' | 'invalid-response' | 'not-found';

export class ApiError extends Error {
  constructor(public kind: ApiErrorKind, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

function toApiError(e: unknown, endpoint: string): ApiError {
  if (e instanceof DecodeError) {
    logger.warn('api.invalid_response', { endpoint, path: e.path });
    return new ApiError('invalid-response', 'The server sent data the app could not read.');
  }
  if (e instanceof AxiosError) {
    if (e.code === 'ECONNABORTED') return new ApiError('timeout', 'The server took too long to respond.');
    if (!e.response) return new ApiError('offline', 'Cannot reach the server.');
    if (e.response.status === 404) return new ApiError('not-found', 'Not found.');
    return new ApiError('server', `Server error (${e.response.status}).`);
  }
  return new ApiError('server', e instanceof Error ? e.message : 'Unknown error');
}

export interface Fetched<T> {
  data: T;
  // Server time, so a wrong phone clock doesn't skew "last synced".
  serverTime: number;
}

const serverTimeOf = (headers: Record<string, unknown>) => {
  const d = Date.parse(String(headers.date ?? ''));
  return Number.isNaN(d) ? Date.now() : d;
};

export async function fetchActiveCampaigns(): Promise<Fetched<Campaign[]>> {
  const endpoint = '/campaigns';
  try {
    const res = await http.get(endpoint, { params: { status: 'RUNNING,SCHEDULED', pageSize: 100 } });
    return { data: decodeCampaignPage(res.data).items, serverTime: serverTimeOf(res.headers) };
  } catch (e) {
    throw toApiError(e, endpoint);
  }
}

export async function fetchCampaign(id: string): Promise<Fetched<Campaign>> {
  const endpoint = `/campaigns/${encodeURIComponent(id)}`;
  try {
    const res = await http.get(endpoint);
    return { data: decodeCampaign(res.data), serverTime: serverTimeOf(res.headers) };
  } catch (e) {
    throw toApiError(e, endpoint);
  }
}
