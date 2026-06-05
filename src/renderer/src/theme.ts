// Theme persistence + application, mirroring the i18n module. The app uses Tailwind
// `darkMode: 'class'`, so a theme is applied by toggling the `dark` class on <html>:
// :root holds the light tokens, .dark holds the cyber-dark tokens. 'system' follows the
// OS via prefers-color-scheme. Default is 'dark' to preserve the original look.
export type Theme = 'light' | 'dark' | 'system'

export const THEMES: Theme[] = ['light', 'dark', 'system']

const KEY = 'theme'

export function getStoredTheme(): Theme {
  if (typeof localStorage === 'undefined') return 'dark'
  const v = localStorage.getItem(KEY)
  return v === 'light' || v === 'dark' || v === 'system' ? v : 'dark'
}

export function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme !== 'system') return theme
  const prefersDark =
    typeof window !== 'undefined' &&
    !!window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  return prefersDark ? 'dark' : 'light'
}

export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', resolveTheme(theme) === 'dark')
}

export function setTheme(theme: Theme): void {
  if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, theme)
  applyTheme(theme)
}

export function initTheme(): void {
  applyTheme(getStoredTheme())
  // Keep `system` in sync when the OS appearance flips while the app is open.
  if (typeof window !== 'undefined' && window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (getStoredTheme() === 'system') applyTheme('system')
    })
  }
}
