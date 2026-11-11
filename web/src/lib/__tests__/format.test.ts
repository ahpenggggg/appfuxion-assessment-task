import { failureRate, fmtPercent, fmtRelative } from '../format';

describe('format helpers', () => {
  it('failure rate excludes pending messages', () => {
    expect(failureRate(75, 25)).toBe(0.25);
    expect(failureRate(0, 0)).toBe(0);
  });
  it('formats percentages without trailing zeros', () => {
    expect(fmtPercent(0.25)).toBe('25%');
    expect(fmtPercent(0.3456)).toBe('34.6%');
  });
  it('formats relative time', () => {
    expect(fmtRelative(1_000, 2_000)).toBe('just now');
    expect(fmtRelative(0, 120_000)).toBe('2 min ago');
  });
});
