import { ApiError } from '@core/api/client';
import { makeCampaign } from '../../../test-utils';
import { syncActiveCampaigns } from '../services/syncService';
import { selectIsOffline, useHealthStore } from '../store/healthStore';

jest.mock('../services/syncService', () => ({
  loadCached: jest.fn(),
  syncActiveCampaigns: jest.fn(),
}));

const syncMock = syncActiveCampaigns as jest.MockedFunction<typeof syncActiveCampaigns>;
const initial = useHealthStore.getState();

beforeEach(() => {
  useHealthStore.setState(initial, true);
  syncMock.mockReset();
});

describe('healthStore offline handling', () => {
  it('recovers when the server comes back while the device stays connected', async () => {
    syncMock.mockRejectedValueOnce(new ApiError('offline', 'Cannot reach the server.'));
    await useHealthStore.getState().sync();
    expect(selectIsOffline(useHealthStore.getState())).toBe(true);

    syncMock.mockResolvedValueOnce({ items: [makeCampaign()], serverTime: 1_000 });
    await useHealthStore.getState().sync();

    const s = useHealthStore.getState();
    expect(selectIsOffline(s)).toBe(false);
    expect(s.campaigns).toHaveLength(1);
    expect(s.consecutiveFailures).toBe(0);
  });

  it('does not sync while the device is offline and syncs on reconnect', async () => {
    syncMock.mockResolvedValue({ items: [], serverTime: 1_000 });
    useHealthStore.getState().setDeviceOffline(true);
    await useHealthStore.getState().sync();
    expect(syncMock).not.toHaveBeenCalled();
    expect(selectIsOffline(useHealthStore.getState())).toBe(true);

    useHealthStore.getState().setDeviceOffline(false);
    expect(syncMock).toHaveBeenCalledTimes(1);
  });

  it('treats server errors as failures, not offline', async () => {
    syncMock.mockRejectedValueOnce(new ApiError('server', 'Server error (500).'));
    await useHealthStore.getState().sync();
    const s = useHealthStore.getState();
    expect(selectIsOffline(s)).toBe(false);
    expect(s.error).toBe('Server error (500).');
  });
});
