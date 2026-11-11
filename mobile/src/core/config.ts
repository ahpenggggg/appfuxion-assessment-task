import { Platform } from 'react-native';

// Android emulators reach the host via 10.0.2.2; a physical device needs the host's LAN IP.
const DEFAULT_API_URL = Platform.select({ android: 'http://localhost:4000', default: 'http://localhost:4000' });

export const config = {
  apiUrl: DEFAULT_API_URL,
  health: {
    alertThreshold: 0.2,
    rearmThreshold: 0.18,
    minSample: 50,
  },
  sync: {
    pollMs: 8_000,
    maxBackoffMs: 60_000,
  },
  security: {
    relockAfterMs: 30_000,
  },
} as const;
