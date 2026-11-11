import { config } from './config';

export function nextPollDelay(consecutiveFailures: number, base: number = config.sync.pollMs, max: number = config.sync.maxBackoffMs): number {
  return Math.min(max, base * 2 ** Math.max(0, consecutiveFailures));
}
