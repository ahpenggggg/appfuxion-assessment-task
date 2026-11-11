import { useEffect, useState } from 'react';
import type { Channel } from '@shared/contracts';
import { analyseCsvText, type CsvSummary } from './csvAnalysis';
import type { WorkerResponse } from './csv.worker';

export type CsvValidation =
  | { status: 'empty' }
  | { status: 'checking'; fraction: number }
  | { status: 'done'; summary: CsvSummary }
  | { status: 'error'; message: string };

const MAX_BYTES = 50 * 1024 * 1024;

export function useCsvValidation(file: File | null, channel: Channel): CsvValidation {
  const [v, setV] = useState<CsvValidation>({ status: 'empty' });

  useEffect(() => {
    if (!file) { setV({ status: 'empty' }); return; }
    if (!/\.csv$/i.test(file.name) && file.type !== 'text/csv') {
      setV({ status: 'error', message: 'Please choose a .csv file.' });
      return;
    }
    if (file.size > MAX_BYTES) {
      setV({ status: 'error', message: 'The file is larger than 50 MB.' });
      return;
    }
    setV({ status: 'checking', fraction: 0 });

    if (typeof Worker === 'undefined') {
      let cancelled = false;
      file.text().then((t) => { if (!cancelled) setV({ status: 'done', summary: analyseCsvText(t, channel) }); });
      return () => { cancelled = true; };
    }

    const worker = new Worker(new URL('./csv.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const m = e.data;
      if (m.type === 'progress') setV({ status: 'checking', fraction: m.fraction });
      if (m.type === 'done') { setV({ status: 'done', summary: m.summary }); worker.terminate(); }
      if (m.type === 'error') { setV({ status: 'error', message: `Could not read the file: ${m.message}` }); worker.terminate(); }
    };
    worker.onerror = () => { setV({ status: 'error', message: 'Could not read the file.' }); worker.terminate(); };
    worker.postMessage({ file, channel });
    return () => worker.terminate();
  }, [file, channel]);

  return v;
}
