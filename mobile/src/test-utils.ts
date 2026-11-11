import type { Campaign } from '@shared/contracts';

export const makeCampaign = (over: Partial<Campaign> = {}): Campaign => ({
  id: 'cmp_1', tenantId: 'tenant-a', name: 'Promo', channel: 'SMS', messageTemplate: 'Hi', scheduledAt: null,
  status: 'RUNNING', totalRecipients: 1000, sentCount: 0, failedCount: 0, pendingCount: 1000, retryQueueSize: 0,
  createdAt: '2026-11-11T08:00:00.000Z', updatedAt: '2026-11-11T08:00:00.000Z', ...over,
});
