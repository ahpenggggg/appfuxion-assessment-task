import { initI18n } from './i18n';
import { registerCampaignHealthModule } from '@modules/campaign-health';
import { registerPushPreviewModule } from '@modules/push-preview';
import { registerSecurityModule } from '@modules/security';

let done = false;
export function registerModules() {
  if (done) return;
  done = true;
  initI18n();
  registerCampaignHealthModule();
  registerPushPreviewModule();
  registerSecurityModule();
}
