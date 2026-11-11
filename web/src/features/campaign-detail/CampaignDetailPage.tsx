import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { CampaignMetrics } from '@shared/contracts';
import { useCampaignDetailStore } from './store';
import { usePolling } from '@/lib/usePolling';
import { failureRate, fmtDateTime, fmtNumber, fmtPercent, fmtTime } from '@/lib/format';
import { Button, Card, ChannelBadge, EmptyState, ErrorState, LiveIndicator, ProgressBar, Skeleton, Stat, StatusBadge } from '@/components/ui';

const POLL_MS = 3000;
const AXIS = { fontSize: 11, fill: '#64748b' };

export default function CampaignDetailPage() {
  const { id = '' } = useParams();
  const { campaign, metrics, state, error, notFound, lastUpdated, retrying, load, retryFailed } = useCampaignDetailStore();
  const [actionError, setActionError] = useState<string | null>(null);
  const justCreated = (useLocation().state as { justCreated?: boolean } | null)?.justCreated;

  useEffect(() => { load(id); }, [id, load]);
  const active = campaign?.status === 'RUNNING' || campaign?.status === 'SCHEDULED';
  usePolling(() => load(id, { background: true }), POLL_MS, !!campaign && active);

  if (notFound) {
    return <Card><EmptyState title="Campaign not found" body={`No campaign with ID ${id}.`} action={<Link to="/campaigns"><Button variant="secondary">Back to campaigns</Button></Link>} /></Card>;
  }
  if (state === 'error' && !campaign) return <Card><ErrorState message={error ?? 'Unknown error'} onRetry={() => load(id)} /></Card>;
  if (!campaign || !metrics) return <DetailSkeleton />;

  const attempted = campaign.sentCount + campaign.failedCount;
  const rate = failureRate(campaign.sentCount, campaign.failedCount);
  const deliveryRate = attempted ? campaign.sentCount / attempted : null;

  return (
    <div className="space-y-5">
      <div>
        <Link to="/campaigns" className="text-sm text-slate-500 hover:text-slate-700">← Campaigns</Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-slate-900">{campaign.name}</h1>
              <StatusBadge status={campaign.status} />
              <ChannelBadge channel={campaign.channel} />
            </div>
            <p className="mt-1 text-sm text-slate-500">
              <span className="font-mono">{campaign.id}</span> · {campaign.tenantId} · created {fmtDateTime(campaign.createdAt)}
              {campaign.scheduledAt && <> · scheduled {fmtDateTime(campaign.scheduledAt)}</>}
            </p>
            <div className="mt-1"><LiveIndicator lastUpdated={lastUpdated} paused={!active} /></div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Button variant="secondary" disabled={campaign.failedCount === 0 || retrying} onClick={async () => setActionError(await retryFailed())}>
              {retrying ? 'Retrying…' : `Retry ${fmtNumber(campaign.failedCount)} failed`}
            </Button>
            {actionError && <p className="text-xs text-red-600">{actionError}</p>}
          </div>
        </div>
      </div>

      {justCreated && <p role="status" className="rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-800 ring-1 ring-emerald-200">Campaign accepted. Sending happens in the background — this page updates automatically.</p>}
      {error && <p role="status" className="rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800 ring-1 ring-amber-200">Live updates failed ({error}). Showing the last data received.</p>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Stat label="Recipients" value={fmtNumber(campaign.totalRecipients)} />
        <Stat label="Sent" value={fmtNumber(campaign.sentCount)} tone="green" />
        <Stat label="Failed" value={fmtNumber(campaign.failedCount)} tone={rate > 0.2 ? 'red' : undefined} hint={attempted ? `${fmtPercent(rate)} of attempted` : undefined} />
        <Stat label="Pending" value={fmtNumber(campaign.pendingCount)} />
        <Stat label="Retry queue" value={fmtNumber(metrics.retryQueueSize)} hint="waiting for next attempt" />
        <Stat label="Throughput" value={fmtNumber(metrics.throughputPerMinute)} hint="messages / minute (last 5 min)" />
      </div>

      <Card>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">Progress</span>
          <span className="tabular-nums text-slate-500">{fmtNumber(attempted)} / {fmtNumber(campaign.totalRecipients)} · delivery rate {deliveryRate === null ? '—' : fmtPercent(deliveryRate)}</span>
        </div>
        <div className="mt-2"><ProgressBar value={campaign.totalRecipients ? attempted / campaign.totalRecipients : 0} tone={rate > 0.2 ? 'red' : 'brand'} /></div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Delivery rate over time"><DeliveryRateChart metrics={metrics} /></Card>
        <Card title="Throughput (messages per minute)"><ThroughputChart metrics={metrics} /></Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
        <Card title="Error breakdown"><ErrorBreakdown metrics={metrics} /></Card>
        <Card title="Message template">
          <p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 font-mono text-sm text-slate-700">{campaign.messageTemplate}</p>
        </Card>
      </div>
    </div>
  );
}

function NoActivity() {
  return <EmptyState title="No sends yet" body="Charts appear once the campaign starts sending." />;
}

function DeliveryRateChart({ metrics }: { metrics: CampaignMetrics }) {
  if (!metrics.series.length) return <NoActivity />;
  const data = metrics.series.map((p) => ({ time: fmtTime(p.minute), rate: Math.round(p.deliveryRate * 1000) / 10 }));
  return (
    <div className="h-64" aria-label="Delivery rate chart">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="time" tick={AXIS} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis domain={[0, 100]} tick={AXIS} tickLine={false} axisLine={false} unit="%" />
          <Tooltip formatter={(v) => [`${v}%`, 'Delivery rate']} />
          <Line type="monotone" dataKey="rate" stroke="#2c57d6" strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function ThroughputChart({ metrics }: { metrics: CampaignMetrics }) {
  if (!metrics.series.length) return <NoActivity />;
  const data = metrics.series.map((p) => ({ time: fmtTime(p.minute), Sent: p.sent, Failed: p.failed }));
  return (
    <div className="h-64" aria-label="Throughput chart">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="time" tick={AXIS} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} />
          <Tooltip />
          <Bar dataKey="Sent" stackId="a" fill="#10b981" isAnimationActive={false} />
          <Bar dataKey="Failed" stackId="a" fill="#ef4444" radius={[3, 3, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ErrorBreakdown({ metrics }: { metrics: CampaignMetrics }) {
  const items = metrics.errorBreakdown;
  if (!items.length) return <EmptyState title="No errors" body="No failed attempts so far." />;
  const total = items.reduce((a, i) => a + i.count, 0);
  return (
    <ul className="space-y-3">
      {items.map((i) => (
        <li key={i.code}>
          <div className="mb-1 flex items-baseline justify-between text-sm">
            <span className="text-slate-700">{i.label} <span className="font-mono text-xs text-slate-400">{i.code}</span></span>
            <span className="tabular-nums text-slate-500">{fmtNumber(i.count)} · {fmtPercent(i.count / total)}</span>
          </div>
          <ProgressBar value={i.count / total} tone="red" label={i.label} />
        </li>
      ))}
      <li className="pt-1 text-xs text-slate-400">Counts every failed attempt, including ones that later succeeded on retry.</li>
    </ul>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-5" aria-label="Loading campaign">
      <Skeleton className="h-8 w-72" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      <div className="grid gap-5 lg:grid-cols-2"><Skeleton className="h-72" /><Skeleton className="h-72" /></div>
    </div>
  );
}
