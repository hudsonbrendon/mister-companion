import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import pt from './locales/pt.json'
import es from './locales/es.json'
import zh from './locales/zh.json'

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'pt', label: 'Português' },
  { code: 'es', label: 'Español' },
  { code: 'zh', label: '中文' }
] as const

const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('lang') : null

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    pt: { translation: pt },
    es: { translation: es },
    zh: { translation: zh }
  },
  lng: stored ?? 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  react: { useSuspense: false }
})

export function setLanguage(code: string): void {
  void i18n.changeLanguage(code)
  if (typeof localStorage !== 'undefined') localStorage.setItem('lang', code)
}

export default i18n
