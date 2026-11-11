import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SecurityGate } from '@modules/security';
import { initialAlertCampaignId, notifeeNotifier, onAlertPressed } from '@modules/alerts';
import { logger } from '@core/logger';
import { registerModules } from './modules';
import { RootNavigator } from './RootNavigator';
import { NavigationService } from './navigationService';

registerModules();

const openCampaign = (id: string) => NavigationService.navigate('CampaignDetail', { id });

export default function App() {
  useEffect(() => {
    notifeeNotifier.ensurePermission()
      .then((granted) => logger.info('alerts.permission', { granted }))
      .catch((e) => logger.warn('alerts.permission_failed', { error: String(e) }));
    initialAlertCampaignId().then((id) => id && openCampaign(id)).catch(() => {});
    return onAlertPressed(openCampaign);
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <SecurityGate>
        <RootNavigator />
      </SecurityGate>
    </SafeAreaProvider>
  );
}
