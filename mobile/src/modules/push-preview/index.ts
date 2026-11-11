import { registerModuleStrings } from '@app/i18n';
import en from './i18n/en.json';

export function registerPushPreviewModule() {
  registerModuleStrings('pushPreview', en);
}

export { PushPreviewScreen } from './screens/PushPreviewScreen';
export { NotificationPreview } from './components/NotificationPreview';
