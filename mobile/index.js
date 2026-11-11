import { AppRegistry } from 'react-native';
import App from './src/app/App';
import { name as appName } from './app.json';
import { registerBackgroundAlertHandler } from './src/modules/alerts';
import { NavigationService } from './src/app/navigationService';

registerBackgroundAlertHandler((campaignId) => NavigationService.navigate('CampaignDetail', { id: campaignId }));

AppRegistry.registerComponent(appName, () => App);
