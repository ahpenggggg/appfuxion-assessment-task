/// <reference lib="webworker" />
import Papa from 'papaparse';
import type { Channel } from '@shared/contracts';
import type { CsvRow } from '@shared/csvRules';
import { cleanHeader, createCsvAccumulator } from './csvAnalysis';

export type WorkerRequest = { file: File; channel: Channel };
export type WorkerResponse =
  | { type: 'progress'; fraction: number }
  | { type: 'done'; summary: ReturnType<ReturnType<typeof createCsvAccumulator>['result']> }
  | { type: 'error'; message: string };

const post = (m: WorkerResponse) => (self as DedicatedWorkerGlobalScope).postMessage(m);

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { file, channel } = e.data;
  const acc = createCsvAccumulator(channel);
  let headerChecked = false;
  let lastReport = 0;
  Papa.parse<CsvRow>(file, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: cleanHeader,
    step: (res, parser) => {
      if (!headerChecked) {
        headerChecked = true;
        if (!acc.header(res.meta.fields ?? [])) { parser.abort(); return; }
      }
      acc.row(res.data);
      const fraction = file.size ? res.meta.cursor / file.size : 1;
      if (fraction - lastReport > 0.02) { lastReport = fraction; post({ type: 'progress', fraction }); }
    },
    complete: () => {
      if (!headerChecked) acc.header([]); // empty file
      post({ type: 'done', summary: acc.result() });
    },
    error: (err) => post({ type: 'error', message: err.message }),
  });
};
