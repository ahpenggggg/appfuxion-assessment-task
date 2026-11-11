import { describe, expect, it } from 'vitest';
import { validateHeader, validateRow } from '../../shared/csvRules';

describe('validateHeader', () => {
  it('accepts the exact header, including an Excel byte-order mark', () => {
    expect(validateHeader(['recipientId', 'email', 'phone'])).toBeNull();
    expect(validateHeader(['﻿recipientId', 'email', 'phone'])).toBeNull();
  });
  it('rejects missing or reordered columns', () => {
    expect(validateHeader(['recipientId', 'phone', 'email'])).toMatch(/Header must be/);
    expect(validateHeader(['recipientId', 'email'])).toMatch(/Header must be/);
  });
});

describe('validateRow', () => {
  const ok = { recipientId: 'r1', email: 'a@b.com', phone: '+60123456789' };

  it('passes a valid row for every channel', () => {
    for (const ch of ['EMAIL', 'SMS', 'PUSH'] as const) expect(validateRow(ok, 1, ch, new Set())).toEqual([]);
  });
  it('flags duplicate recipient ids', () => {
    const seen = new Set<string>();
    validateRow(ok, 1, 'PUSH', seen);
    expect(validateRow(ok, 2, 'PUSH', seen)[0].message).toMatch(/Duplicate/);
  });
  it('requires the column the channel needs', () => {
    expect(validateRow({ recipientId: 'r', email: '', phone: '+60123456789' }, 1, 'EMAIL', new Set())[0].field).toBe('email');
    expect(validateRow({ recipientId: 'r', email: 'a@b.com', phone: '' }, 1, 'SMS', new Set())[0].field).toBe('phone');
    expect(validateRow({ recipientId: 'r', email: '', phone: '' }, 1, 'PUSH', new Set())).toEqual([]);
  });
  it('rejects badly formatted email and local phone numbers', () => {
    const errs = validateRow({ recipientId: 'r', email: 'nope', phone: '0123456789' }, 7, 'PUSH', new Set());
    expect(errs.map((e) => e.field).sort()).toEqual(['email', 'phone']);
    expect(errs.every((e) => e.row === 7)).toBe(true);
  });
});
