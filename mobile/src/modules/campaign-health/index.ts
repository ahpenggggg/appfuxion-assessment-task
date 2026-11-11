import { registerModuleStrings } from '@app/i18n';
import en from './i18n/en.json';

export function registerCampaignHealthModule() {
  registerModuleStrings('campaignHealth', en);
}

export { CampaignHealthScreen } from './screens/CampaignHealthScreen';
export { CampaignDetailScreen } from './screens/CampaignDetailScreen';
export { useHealthStore } from './store/healthStore';
