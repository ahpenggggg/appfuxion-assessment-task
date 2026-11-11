import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { CAMPAIGN_STATUSES, CHANNELS, type Campaign, type CampaignListQuery, type CampaignStatus, type Channel } from '@shared/contracts';
import { useCampaignListStore } from './store';
import { usePolling } from '@/lib/usePolling';
import { failureRate, fmtDateTime, fmtNumber, fmtPercent } from '@/lib/format';
import { Button, Card, ChannelBadge, EmptyState, ErrorState, LiveIndicator, ProgressBar, Skeleton, StatusBadge } from '@/components/ui';
import { inputClass, selectClass } from '@/components/classes';

const PAGE_SIZE = 10;
const POLL_MS = 5000;

function useListQuery(): [CampaignListQuery, (patch: Partial<CampaignListQuery>) => void] {
  const [params, setParams] = useSearchParams();
  const query = useMemo<CampaignListQuery>(() => ({
    search: params.get('search') ?? '',
    tenantId: params.get('tenantId') ?? '',
    channel: (params.get('channel') as Channel) || undefined,
    status: (params.get('status') as CampaignStatus) || undefined,
    page: Number(params.get('page')) || 1,
    pageSize: PAGE_SIZE,
  }), [params]);

  const update = (patch: Partial<CampaignListQuery>) => {
    const next = { ...query, page: 1, ...patch };
    const out = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) {
      if (k === 'pageSize' || v === undefined || v === '' || (k === 'page' && v === 1)) continue;
      out.set(k, String(v));
    }
    setParams(out, { replace: true });
  };
  return [query, update];
}

export default function CampaignListPage() {
  const [query, update] = useListQuery();
  const { data, state, error, lastUpdated, tenants, fetch, loadTenants } = useCampaignListStore();
  const [searchText, setSearchText] = useState(query.search ?? '');

  useEffect(() => { loadTenants(); }, [loadTenants]);

  useEffect(() => {
    const t = setTimeout(() => { if (searchText !== query.search) update({ search: searchText }); }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  const key = JSON.stringify(query);
  useEffect(() => { fetch(query); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  usePolling(() => { if (useCampaignListStore.getState().state !== 'loading') fetch(query, { background: true }); }, POLL_MS);

  const hasFilters = !!(query.search || query.tenantId || query.channel || query.status);
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Campaigns</h1>
          <div className="mt-1"><LiveIndicator lastUpdated={lastUpdated} /></div>
        </div>
        <Link to="/campaigns/new"><Button>+ New campaign</Button></Link>
      </div>

      <Card>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]">
          <input
            aria-label="Search campaigns"
            className={inputClass}
            placeholder="Search by campaign ID or name"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <select aria-label="Tenant" className={selectClass} value={query.tenantId} onChange={(e) => update({ tenantId: e.target.value })}>
            <option value="">All tenants</option>
            {tenants.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select aria-label="Channel" className={selectClass} value={query.channel ?? ''} onChange={(e) => update({ channel: (e.target.value as Channel) || undefined })}>
            <option value="">All channels</option>
            {CHANNELS.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select aria-label="Status" className={selectClass} value={query.status ?? ''} onChange={(e) => update({ status: (e.target.value as CampaignStatus) || undefined })}>
            <option value="">All statuses</option>
            {CAMPAIGN_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <Button variant="ghost" disabled={!hasFilters} onClick={() => { setSearchText(''); update({ search: '', tenantId: '', channel: undefined, status: undefined }); }}>
            Clear
          </Button>
        </div>
      </Card>

      {error && data && (
        <p role="status" className="rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800 ring-1 ring-amber-200">
          Live updates failed ({error}). Showing the last data received; retrying automatically.
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {state === 'error' && !data ? (
          <ErrorState message={error ?? 'Unknown error'} onRetry={() => fetch(query)} />
        ) : !data ? (
          <ListSkeleton />
        ) : data.items.length === 0 ? (
          hasFilters
            ? <EmptyState title="No campaigns match these filters" body="Try a different search or clear the filters." />
            : <EmptyState title="No campaigns yet" body="Create a campaign to start sending notifications." action={<Link to="/campaigns/new"><Button>New campaign</Button></Link>} />
        ) : (
          <>
            <CampaignTable items={data.items} />
            <CampaignCards items={data.items} />
            <Pagination page={data.page} totalPages={totalPages} total={data.total} pageSize={PAGE_SIZE} onPage={(page) => update({ page })} />
          </>
        )}
      </div>
    </div>
  );
}

function SentCell({ c }: { c: Campaign }) {
  const done = c.sentCount + c.failedCount;
  return (
    <div className="min-w-28">
      <div className="tabular-nums">{fmtNumber(c.sentCount)}</div>
      <div className="mt-1"><ProgressBar value={c.totalRecipients ? done / c.totalRecipients : 0} label={`${c.id} progress`} /></div>
    </div>
  );
}

function FailedCell({ c }: { c: Campaign }) {
  const rate = failureRate(c.sentCount, c.failedCount);
  return (
    <div className="tabular-nums">
      <span className={rate > 0.2 ? 'font-semibold text-red-600' : ''}>{fmtNumber(c.failedCount)}</span>
      {c.sentCount + c.failedCount > 0 && <span className="ml-1 text-xs text-slate-400">({fmtPercent(rate)})</span>}
    </div>
  );
}

function CampaignTable({ items }: { items: Campaign[] }) {
  const navigate = useNavigate();
  return (
    <table className="hidden w-full text-left text-sm md:table">
      <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500">
        <tr>
          <th className="px-4 py-3">Campaign</th>
          <th className="px-4 py-3">Tenant</th>
          <th className="px-4 py-3">Channel</th>
          <th className="px-4 py-3 text-right">Recipients</th>
          <th className="px-4 py-3">Sent</th>
          <th className="px-4 py-3">Failed</th>
          <th className="px-4 py-3">Status</th>
          <th className="px-4 py-3">Created</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {items.map((c) => (
          <tr key={c.id} className="cursor-pointer hover:bg-slate-50" onClick={() => navigate(`/campaigns/${c.id}`)}>
            <td className="px-4 py-3">
              <Link to={`/campaigns/${c.id}`} className="font-medium text-slate-900 hover:text-brand-600" onClick={(e) => e.stopPropagation()}>{c.name}</Link>
              <div className="font-mono text-xs text-slate-400">{c.id}</div>
            </td>
            <td className="px-4 py-3 text-slate-600">{c.tenantId}</td>
            <td className="px-4 py-3"><ChannelBadge channel={c.channel} /></td>
            <td className="px-4 py-3 text-right tabular-nums">{fmtNumber(c.totalRecipients)}</td>
            <td className="px-4 py-3"><SentCell c={c} /></td>
            <td className="px-4 py-3"><FailedCell c={c} /></td>
            <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-500">{fmtDateTime(c.createdAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CampaignCards({ items }: { items: Campaign[] }) {
  return (
    <ul className="divide-y divide-slate-100 md:hidden">
      {items.map((c) => (
        <li key={c.id}>
          <Link to={`/campaigns/${c.id}`} className="block space-y-2 px-4 py-3 hover:bg-slate-50">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-slate-900">{c.name}</p>
                <p className="font-mono text-xs text-slate-400">{c.id} · {c.tenantId}</p>
              </div>
              <StatusBadge status={c.status} />
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-600">
              <ChannelBadge channel={c.channel} />
              <span>{fmtNumber(c.totalRecipients)} recipients</span>
              <span>Sent {fmtNumber(c.sentCount)}</span>
              <span className={failureRate(c.sentCount, c.failedCount) > 0.2 ? 'font-semibold text-red-600' : ''}>Failed {fmtNumber(c.failedCount)}</span>
            </div>
            <ProgressBar value={c.totalRecipients ? (c.sentCount + c.failedCount) / c.totalRecipients : 0} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Pagination({ page, totalPages, total, pageSize, onPage }: { page: number; totalPages: number; total: number; pageSize: number; onPage: (p: number) => void }) {
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
      <p className="text-slate-500">Showing <span className="font-medium text-slate-700">{from}–{to}</span> of <span className="font-medium text-slate-700">{total}</span></p>
      <div className="flex items-center gap-2">
        <Button variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button>
        <span className="tabular-nums text-slate-500">{page} / {totalPages}</span>
        <Button variant="secondary" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Next</Button>
      </div>
    </nav>
  );
}

function ListSkeleton() {
  return (
    <div className="divide-y divide-slate-100" aria-label="Loading campaigns">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="ml-auto h-4 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}
