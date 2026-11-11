import { analyseCsvText } from '../csvAnalysis';

describe('analyseCsvText', () => {
  it('accepts a valid file and returns a 5-row preview', () => {
    const rows = Array.from({ length: 8 }, (_, i) => `r${i},u${i}@ex.com,+6012345678${i}`);
    const s = analyseCsvText(['recipientId,email,phone', ...rows].join('\n'), 'EMAIL');
    expect(s.headerError).toBeNull();
    expect(s.rowCount).toBe(8);
    expect(s.preview).toHaveLength(5);
    expect(s.errorCount).toBe(0);
  });

  it('strips an Excel byte-order mark and ignores blank rows', () => {
    const s = analyseCsvText('﻿recipientId,email,phone\nr1,a@b.com,\n,,\n\n', 'EMAIL');
    expect(s.headerError).toBeNull();
    expect(s.rowCount).toBe(1);
  });

  it('reports a wrong header without checking rows', () => {
    const s = analyseCsvText('id,mail\n1,2', 'EMAIL');
    expect(s.headerError).toMatch(/Header must be/);
    expect(s.rowCount).toBe(0);
  });

  it('reports an empty file', () => {
    expect(analyseCsvText('recipientId,email,phone\n', 'PUSH').headerError).toMatch(/no recipient rows/);
  });

  it('applies channel rules and caps the error list at 100', () => {
    const rows = Array.from({ length: 150 }, (_, i) => `r${i},,`);
    const s = analyseCsvText(['recipientId,email,phone', ...rows].join('\n'), 'SMS');
    expect(s.errorCount).toBe(150);
    expect(s.errors).toHaveLength(100);
    expect(s.errors[0]).toMatchObject({ row: 1, field: 'phone' });
  });
});
