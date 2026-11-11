export type Channel = 'EMAIL' | 'SMS' | 'PUSH';
export const CHANNELS: Channel[] = ['EMAIL', 'SMS', 'PUSH'];

export type CampaignStatus = 'SCHEDULED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
export const CAMPAIGN_STATUSES: CampaignStatus[] = ['SCHEDULED', 'RUNNING', 'COMPLETED', 'FAILED'];

export interface Campaign {
  id: string;
  tenantId: string;
  name: string;
  channel: Channel;
  messageTemplate: string;
  // null starts immediately.
  scheduledAt: string | null;
  status: CampaignStatus;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  pendingCount: number;
  retryQueueSize: number;
  createdAt: string;
  updatedAt: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface CampaignListQuery {
  search?: string;
  tenantId?: string;
  channel?: Channel;
  status?: CampaignStatus;
  page?: number;
  pageSize?: number;
}

export interface MetricPoint {
  minute: string; // ISO, start of the minute
  sent: number;
  failed: number;
  // Cumulative, 0–1.
  deliveryRate: number;
}

export interface ErrorBreakdownItem {
  code: string;
  label: string;
  count: number;
}

export interface CampaignMetrics {
  campaignId: string;
  series: MetricPoint[];
  // Averaged over the last 5 minutes of activity.
  throughputPerMinute: number;
  errorBreakdown: ErrorBreakdownItem[];
  retryQueueSize: number;
}

export interface CreateCampaignFields {
  tenantId: string;
  name: string;
  channel: Channel;
  messageTemplate: string;
  scheduledAt: string | null;
}

export interface RowError {
  row: number; // 1-based data row (header excluded)
  field: string;
  message: string;
}

export interface ApiErrorBody {
  error: {
    code: 'VALIDATION_ERROR' | 'NOT_FOUND' | 'CONFLICT' | 'INTERNAL' | 'PAYLOAD_TOO_LARGE';
    message: string;
    rowErrors?: RowError[];
  };
}

export const CSV_HEADER = ['recipientId', 'email', 'phone'] as const;
