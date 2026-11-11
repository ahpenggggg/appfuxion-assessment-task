const nf = new Intl.NumberFormat('en-MY');

export const fmtNumber = (n: number) => nf.format(n);

export const fmtPercent = (fraction: number, digits = 1) =>
  `${(fraction * 100).toFixed(digits).replace(/\.0+$/, '')}%`;

export function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-MY', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' });
}

export function fmtRelative(ms: number, now = Date.now()) {
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  return `${Math.round(m / 60)} h ago`;
}

export function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 ** 2).toFixed(1)} MB`;
}

export function failureRate(sent: number, failed: number) {
  const attempted = sent + failed;
  return attempted ? failed / attempted : 0;
}
