import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { CampaignStatus, Channel } from '@shared/contracts';
import { cx } from './classes';


type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
export function Button({ variant = 'primary', className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const styles: Record<Variant, string> = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 disabled:bg-slate-300',
    secondary: 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 disabled:text-slate-400',
    ghost: 'text-slate-600 hover:bg-slate-100 disabled:text-slate-300',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-slate-300',
  };
  return (
    <button
      {...p}
      className={cx('inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed', styles[variant], className)}
    />
  );
}

export function Card({ title, actions, children, className }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx('rounded-xl border border-slate-200 bg-white shadow-sm', className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {actions}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

const STATUS_STYLE: Record<CampaignStatus, string> = {
  SCHEDULED: 'bg-slate-100 text-slate-700 ring-slate-200',
  RUNNING: 'bg-blue-50 text-blue-700 ring-blue-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  FAILED: 'bg-red-50 text-red-700 ring-red-200',
};
export function StatusBadge({ status }: { status: CampaignStatus }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', STATUS_STYLE[status])}>
      {status === 'RUNNING' && <span className="size-1.5 animate-pulse rounded-full bg-blue-500" />}
      {status}
    </span>
  );
}

const CHANNEL_STYLE: Record<Channel, string> = {
  EMAIL: 'text-violet-700 bg-violet-50',
  SMS: 'text-amber-700 bg-amber-50',
  PUSH: 'text-teal-700 bg-teal-50',
};
export function ChannelBadge({ channel }: { channel: Channel }) {
  return <span className={cx('rounded px-1.5 py-0.5 text-xs font-semibold tracking-wide', CHANNEL_STYLE[channel])}>{channel}</span>;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('animate-pulse rounded bg-slate-200/70', className)} />;
}

export function ProgressBar({ value, tone = 'brand', label }: { value: number; tone?: 'brand' | 'green' | 'red'; label?: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  const color = { brand: 'bg-brand-500', green: 'bg-emerald-500', red: 'bg-red-500' }[tone];
  return (
    <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label} className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={cx('h-full rounded-full transition-[width] duration-300', color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <div className="flex size-10 items-center justify-center rounded-full bg-red-50 text-lg text-red-600">!</div>
      <div>
        <p className="font-medium text-slate-900">Couldn't load this</p>
        <p className="mt-1 text-sm text-slate-500">{message}</p>
      </div>
      {onRetry && <Button variant="secondary" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">∅</div>
      <p className="font-medium text-slate-900">{title}</p>
      {body && <p className="max-w-sm text-sm text-slate-500">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: 'red' | 'green' }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={cx('mt-1 text-2xl font-semibold tabular-nums', tone === 'red' ? 'text-red-600' : tone === 'green' ? 'text-emerald-600' : 'text-slate-900')}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function LiveIndicator({ lastUpdated, paused }: { lastUpdated: number | null; paused?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-slate-500" aria-live="polite">
      <span className={cx('size-2 rounded-full', paused ? 'bg-slate-300' : 'animate-pulse bg-emerald-500')} />
      {paused ? 'Updates paused' : 'Live'}
      {lastUpdated && <span>· updated {new Date(lastUpdated).toLocaleTimeString('en-MY')}</span>}
    </span>
  );
}


export function Field({ label, htmlFor, error, hint, children }: { label: string; htmlFor: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      {children}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}
