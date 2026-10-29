import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import fr from './locales/fr.json';
import ar from './locales/ar.json';
import en from './locales/en.json';

const LANGUAGE_KEY = '@logistic:language';

export async function initI18n() {
  // Récupérer la langue sauvegardée
  let savedLang = 'fr';
  try {
    savedLang = (await AsyncStorage.getItem(LANGUAGE_KEY)) || 'fr';
  } catch { /* ignorer */ }

  await i18n
    .use(initReactI18next)
    .init({
      resources: {
        fr: { translation: fr },
        ar: { translation: ar },
        en: { translation: en },
      },
      lng: savedLang,
      fallbackLng: 'fr',
      interpolation: { escapeValue: false },
      compatibilityJSON: 'v3',
    });

  return i18n;
}

export async function changeLanguage(lang: 'fr' | 'ar' | 'en') {
  await i18n.changeLanguage(lang);
  await AsyncStorage.setItem(LANGUAGE_KEY, lang);
}

export default i18n;
