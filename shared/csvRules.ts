import { CSV_HEADER, type Channel, type RowError } from './contracts';

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const PHONE_RE = /^\+[1-9]\d{7,14}$/;

export const MAX_ROW_ERRORS = 100;

export interface CsvRow {
  recipientId?: string;
  email?: string;
  phone?: string;
}

export function validateHeader(fields: string[]): string | null {
  const cleaned = fields.map((f, i) => (i === 0 ? f.replace(/^﻿/, '') : f).trim());
  const expected = CSV_HEADER.join(',');
  if (cleaned.join(',') !== expected) {
    return `Header must be exactly "${expected}" (found "${cleaned.join(',')}")`;
  }
  return null;
}

// Mutates seenIds to detect duplicates.
export function validateRow(
  row: CsvRow,
  rowNumber: number,
  channel: Channel,
  seenIds: Set<string>,
): RowError[] {
  const errors: RowError[] = [];
  const id = (row.recipientId ?? '').trim();
  const email = (row.email ?? '').trim();
  const phone = (row.phone ?? '').trim();

  if (!id) {
    errors.push({ row: rowNumber, field: 'recipientId', message: 'recipientId is required' });
  } else if (seenIds.has(id)) {
    errors.push({ row: rowNumber, field: 'recipientId', message: `Duplicate recipientId "${id}"` });
  } else {
    seenIds.add(id);
  }

  if (email && !EMAIL_RE.test(email)) {
    errors.push({ row: rowNumber, field: 'email', message: `Invalid email "${email}"` });
  }
  if (phone && !PHONE_RE.test(phone)) {
    errors.push({ row: rowNumber, field: 'phone', message: `Phone must be international format like +60123456789 (got "${phone}")` });
  }

  if (channel === 'EMAIL' && !email) {
    errors.push({ row: rowNumber, field: 'email', message: 'email is required for EMAIL campaigns' });
  }
  if (channel === 'SMS' && !phone) {
    errors.push({ row: rowNumber, field: 'phone', message: 'phone is required for SMS campaigns' });
  }
  return errors;
}
