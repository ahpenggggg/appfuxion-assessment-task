import Papa from 'papaparse';
import type { Channel, RowError } from '@shared/contracts';
import { MAX_ROW_ERRORS, validateHeader, validateRow, type CsvRow } from '@shared/csvRules';

export const PREVIEW_ROWS = 5;

export interface CsvSummary {
  headerError: string | null;
  rowCount: number;
  preview: CsvRow[];
  errors: RowError[];
  errorCount: number;
}

export const cleanHeader = (h: string) => h.replace(/^﻿/, '').trim();

export function createCsvAccumulator(channel: Channel) {
  const seen = new Set<string>();
  const s: CsvSummary = { headerError: null, rowCount: 0, preview: [], errors: [], errorCount: 0 };
  return {
    header(fields: string[]) {
      s.headerError = validateHeader(fields);
      return s.headerError === null;
    },
    row(r: CsvRow) {
      s.rowCount += 1;
      if (s.preview.length < PREVIEW_ROWS) s.preview.push(r);
      const errs = validateRow(r, s.rowCount, channel, seen);
      s.errorCount += errs.length;
      for (const e of errs) if (s.errors.length < MAX_ROW_ERRORS) s.errors.push(e);
    },
    result(): CsvSummary {
      if (!s.headerError && s.rowCount === 0) return { ...s, headerError: 'The file has no recipient rows.' };
      return s;
    },
  };
}

export function analyseCsvText(text: string, channel: Channel): CsvSummary {
  const acc = createCsvAccumulator(channel);
  const parsed = Papa.parse<CsvRow>(text, { header: true, skipEmptyLines: 'greedy', transformHeader: cleanHeader });
  if (!acc.header(parsed.meta.fields ?? [])) return acc.result();
  parsed.data.forEach((r) => acc.row(r));
  return acc.result();
}

export function sampleCsv(): string {
  return [
    'recipientId,email,phone',
    'cust-0001,aisyah@example.com,+60123456781',
    'cust-0002,wei.ming@example.com,+60123456782',
    'cust-0003,raj@example.com,+60123456783',
  ].join('\n');
}
