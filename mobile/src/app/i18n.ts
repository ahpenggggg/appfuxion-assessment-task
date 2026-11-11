import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

let initialised = false;

export function initI18n() {
  if (initialised) return i18n;
  initialised = true;
  i18n.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    resources: {},
    interpolation: { escapeValue: false },
    returnNull: false,
  });
  return i18n;
}

export function registerModuleStrings(namespace: string, en: Record<string, unknown>) {
  initI18n().addResourceBundle('en', namespace, en, true, true);
}
