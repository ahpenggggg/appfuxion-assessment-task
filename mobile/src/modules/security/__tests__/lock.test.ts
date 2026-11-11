import { shouldRelock } from '../store/lockStore';

describe('shouldRelock', () => {
  it('re-locks only after more than 30 s in the background', () => {
    expect(shouldRelock(null, 100_000)).toBe(false);
    expect(shouldRelock(0, 30_000)).toBe(false);
    expect(shouldRelock(0, 30_001)).toBe(true);
  });
});
