import { registerModuleStrings } from '@app/i18n';
import en from './i18n/en.json';

export function registerSecurityModule() {
  registerModuleStrings('security', en);
}

export { SecurityGate } from './components/SecurityGate';
export { shouldRelock } from './store/lockStore';
