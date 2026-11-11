jest.mock('@react-navigation/native', () => {
  const ref = { isReady: jest.fn(() => true), navigate: jest.fn() };
  return { createNavigationContainerRef: () => ref };
});
import { NavigationService, navigationRef } from '../navigationService';

describe('NavigationService', () => {
  it('queues navigation until the navigator is ready, then replays it', () => {
    NavigationService.navigate('CampaignDetail', { id: 'cmp_6' });
    expect(navigationRef.navigate).not.toHaveBeenCalled();
    NavigationService.onReady();
    expect(navigationRef.navigate).toHaveBeenCalledWith('CampaignDetail', { id: 'cmp_6' });
  });

  it('holds navigation while the app is locked', () => {
    (navigationRef.navigate as jest.Mock).mockClear();
    NavigationService.setBlocked(true);
    NavigationService.navigate('CampaignDetail', { id: 'cmp_7' });
    expect(navigationRef.navigate).not.toHaveBeenCalled();
    NavigationService.setBlocked(false);
    expect(navigationRef.navigate).toHaveBeenCalledWith('CampaignDetail', { id: 'cmp_7' });
  });
});
