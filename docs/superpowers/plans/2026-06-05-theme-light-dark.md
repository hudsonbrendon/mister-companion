# Light / Dark Theme Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Light / Dark / System theme toggle in the sidebar footer (next to the version + update badge), persisted across launches, that restyles the whole app.

**Architecture:** The app already uses Tailwind with `darkMode: 'class'` and HSL design tokens, but every token lives in `:root` so the app is "always dark." We split the tokens: `:root` becomes the **light** theme, a `.dark` selector holds the existing **cyber-dark** theme, and a tiny `theme.ts` module toggles the `dark` class on `<html>` (mirroring the existing `i18n` localStorage pattern). A `ThemeSwitcher` segmented control drives it. `system` follows `prefers-color-scheme`.

**Tech Stack:** TypeScript, React 18, Tailwind CSS 3.4 (class dark mode), CSS custom properties (HSL tokens), Vitest + @testing-library/react (jsdom), react-i18next, lucide-react.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `src/renderer/src/theme.ts` (create) | Theme model + persistence: `Theme` type, `THEMES`, `getStoredTheme`, `resolveTheme`, `applyTheme`, `setTheme`, `initTheme`. No React. Mirrors `i18n/index.ts`. |
| `src/renderer/src/theme.test.ts` (create) | Unit tests for the theme module (toggles `dark` class, persists, resolves `system`). |
| `src/renderer/src/index.css` (modify) | Split tokens: `:root` = light theme, `.dark` = current cyber-dark; light `#root` ambient gradient. |
| `src/renderer/src/main.tsx` (modify) | Call `initTheme()` on boot before render. |
| `src/renderer/src/components/ThemeSwitcher.tsx` (create) | Sidebar segmented control (Sun/Moon/Laptop) → `setTheme`. |
| `src/renderer/src/components/ThemeSwitcher.test.tsx` (create) | Clicking Light/Dark toggles the `dark` class + persists. |
| `src/renderer/src/components/Sidebar.tsx` (modify) | Render `<ThemeSwitcher />` in the footer, above `<VersionBadge />`. |
| `src/renderer/src/i18n/locales/{en,pt,es,zh}.json` (modify) | Add a `theme` section (`light`, `dark`, `system`). |

**Why these boundaries:** `theme.ts` is pure DOM/localStorage logic — unit-testable without React, exactly like `i18n/index.ts`. The CSS change is isolated to token definitions (no component edits needed because every component already styles via tokens). The UI is one small component dropped into the existing footer cluster.

**Default theme:** `dark`. The app currently ships dark; defaulting to `dark` (not `system`) preserves the established look for existing users until they choose otherwise.

---

### Task 1: Theme module (`theme.ts`)

**Files:**
- Create: `src/renderer/src/theme.ts`
- Test: `src/renderer/src/theme.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/renderer/src/theme.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getStoredTheme, resolveTheme, applyTheme, setTheme } from './theme'

beforeEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove('dark')
})

describe('theme', () => {
  it('defaults to dark when nothing is stored', () => {
    expect(getStoredTheme()).toBe('dark')
  })

  it('reads a previously stored theme', () => {
    localStorage.setItem('theme', 'light')
    expect(getStoredTheme()).toBe('light')
  })

  it('applyTheme toggles the dark class on <html>', () => {
    applyTheme('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    applyTheme('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('setTheme persists to localStorage and applies it', () => {
    setTheme('light')
    expect(localStorage.getItem('theme')).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('resolveTheme maps system to light/dark via prefers-color-scheme', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia
    expect(resolveTheme('system')).toBe('dark')
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia
    expect(resolveTheme('system')).toBe('light')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- theme.test`
Expected: FAIL — `Cannot find module './theme'`.

- [ ] **Step 3: Write the module**

Create `src/renderer/src/theme.ts`:

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- theme.test`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/theme.ts src/renderer/src/theme.test.ts
git commit -m "feat(theme): add theme persistence module (light/dark/system)"
```

---

### Task 2: Split CSS tokens into light (`:root`) + dark (`.dark`)

**Files:**
- Modify: `src/renderer/src/index.css`

There is no unit test for raw CSS; this task is verified by build + the device screenshots in Task 6. Apply the change exactly.

- [ ] **Step 1: Replace the `:root` token block with a light theme**

In `src/renderer/src/index.css`, replace this existing block:

```css
:root {
  --background: 252 26% 9%;
  --foreground: 250 30% 92%;
  --card: 252 24% 13%;
  --card-foreground: 250 30% 92%;
  --primary: 252 100% 65%;
  --primary-foreground: 0 0% 100%;
  --secondary: 252 18% 20%;
  --secondary-foreground: 250 30% 92%;
  --muted: 252 16% 18%;
  --muted-foreground: 250 12% 65%;
  --accent: 252 30% 22%;
  --accent-foreground: 250 30% 96%;
  --destructive: 0 72% 55%;
  --destructive-foreground: 0 0% 100%;
  --pink: 327 100% 68%;
  --pink-foreground: 0 0% 100%;
  --border: 252 18% 22%;
  --input: 252 18% 24%;
  --ring: 252 100% 65%;
  --radius: 0.75rem;
}
```

with the light theme in `:root` plus the original cyber-dark theme moved verbatim into `.dark`:

```css
:root {
  --background: 250 50% 98%;
  --foreground: 252 35% 16%;
  --card: 0 0% 100%;
  --card-foreground: 252 35% 16%;
  --primary: 252 95% 62%;
  --primary-foreground: 0 0% 100%;
  --secondary: 252 30% 92%;
  --secondary-foreground: 252 30% 22%;
  --muted: 250 30% 94%;
  --muted-foreground: 252 12% 42%;
  --accent: 252 40% 92%;
  --accent-foreground: 252 35% 20%;
  --destructive: 0 72% 50%;
  --destructive-foreground: 0 0% 100%;
  --pink: 327 90% 58%;
  --pink-foreground: 0 0% 100%;
  --border: 252 24% 88%;
  --input: 252 24% 85%;
  --ring: 252 95% 62%;
  --radius: 0.75rem;
}

.dark {
  --background: 252 26% 9%;
  --foreground: 250 30% 92%;
  --card: 252 24% 13%;
  --card-foreground: 250 30% 92%;
  --primary: 252 100% 65%;
  --primary-foreground: 0 0% 100%;
  --secondary: 252 18% 20%;
  --secondary-foreground: 250 30% 92%;
  --muted: 252 16% 18%;
  --muted-foreground: 250 12% 65%;
  --accent: 252 30% 22%;
  --accent-foreground: 250 30% 96%;
  --destructive: 0 72% 55%;
  --destructive-foreground: 0 0% 100%;
  --pink: 327 100% 68%;
  --pink-foreground: 0 0% 100%;
  --border: 252 18% 22%;
  --input: 252 18% 24%;
  --ring: 252 100% 65%;
}
```

- [ ] **Step 2: Add a light variant of the `#root` ambient gradient**

In `src/renderer/src/index.css`, replace this existing block:

```css
/* Subtle radial purple ambience behind the app */
#root {
  background:
    radial-gradient(1100px 700px at 12% -10%, hsl(252 60% 22% / 0.5), transparent 60%),
    radial-gradient(900px 600px at 110% 0%, hsl(327 60% 24% / 0.28), transparent 55%);
}
```

with a light default plus a dark override:

```css
/* Subtle radial purple ambience behind the app (light by default) */
#root {
  background:
    radial-gradient(1100px 700px at 12% -10%, hsl(252 80% 90% / 0.7), transparent 60%),
    radial-gradient(900px 600px at 110% 0%, hsl(327 85% 92% / 0.5), transparent 55%);
}

.dark #root {
  background:
    radial-gradient(1100px 700px at 12% -10%, hsl(252 60% 22% / 0.5), transparent 60%),
    radial-gradient(900px 600px at 110% 0%, hsl(327 60% 24% / 0.28), transparent 55%);
}
```

- [ ] **Step 3: Verify the build compiles**

Run: `npm run build`
Expected: `✓ built` with no CSS errors.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/src/index.css
git commit -m "feat(theme): split tokens into light (:root) and dark (.dark)"
```

---

### Task 3: Apply the stored theme on boot

**Files:**
- Modify: `src/renderer/src/main.tsx`

- [ ] **Step 1: Call `initTheme()` before render**

Replace the entire contents of `src/renderer/src/main.tsx`:

```tsx
import './index.css'
import './i18n'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { initTheme } from './theme'

initTheme()

createRoot(document.getElementById('root')!).render(<App />)
```

- [ ] **Step 2: Verify the build compiles**

Run: `npm run build`
Expected: `✓ built`.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/main.tsx
git commit -m "feat(theme): apply the stored theme on app boot"
```

---

### Task 4: ThemeSwitcher component + i18n

**Files:**
- Create: `src/renderer/src/components/ThemeSwitcher.tsx`
- Test: `src/renderer/src/components/ThemeSwitcher.test.tsx`
- Modify: `src/renderer/src/i18n/locales/en.json`, `pt.json`, `es.json`, `zh.json`

- [ ] **Step 1: Add the i18n keys (all four locales)**

In `src/renderer/src/i18n/locales/en.json`, add a top-level `"theme"` entry (place it after the `"update"` entry):

```json
  "theme": { "light": "Light", "dark": "Dark", "system": "System" },
```

In `pt.json`:

```json
  "theme": { "light": "Claro", "dark": "Escuro", "system": "Sistema" },
```

In `es.json`:

```json
  "theme": { "light": "Claro", "dark": "Oscuro", "system": "Sistema" },
```

In `zh.json`:

```json
  "theme": { "light": "浅色", "dark": "深色", "system": "系统" },
```

(Each is a sibling key inside the root JSON object — add a trailing comma to the previous line if needed so the file stays valid JSON.)

- [ ] **Step 2: Write the failing test**

Create `src/renderer/src/components/ThemeSwitcher.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeSwitcher } from './ThemeSwitcher'

beforeEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove('dark')
})

describe('ThemeSwitcher', () => {
  it('switches to light (removes dark class, persists) then dark (adds it)', () => {
    render(<ThemeSwitcher />)

    fireEvent.click(screen.getByRole('button', { name: /^light$/i }))
    expect(localStorage.getItem('theme')).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: /^dark$/i }))
    expect(localStorage.getItem('theme')).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('marks the active theme with aria-pressed', () => {
    localStorage.setItem('theme', 'light')
    render(<ThemeSwitcher />)
    expect(screen.getByRole('button', { name: /^light$/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /^dark$/i })).toHaveAttribute('aria-pressed', 'false')
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- ThemeSwitcher`
Expected: FAIL — `Cannot find module './ThemeSwitcher'`.

- [ ] **Step 4: Write the component**

Create `src/renderer/src/components/ThemeSwitcher.tsx`:

```tsx
import { useState } from 'react'
import { Sun, Moon, Laptop } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Theme, getStoredTheme, setTheme } from '../theme'
import { cn } from '../lib/utils'

const OPTIONS: { value: Theme; icon: React.ComponentType<{ className?: string }>; key: string }[] = [
  { value: 'light', icon: Sun, key: 'theme.light' },
  { value: 'dark', icon: Moon, key: 'theme.dark' },
  { value: 'system', icon: Laptop, key: 'theme.system' }
]

// Segmented Light / Dark / System control for the sidebar footer. Theme isn't in React
// state globally (it's a DOM class), so this holds its own selection mirror.
export function ThemeSwitcher(): JSX.Element {
  const { t } = useTranslation()
  const [theme, setThemeState] = useState<Theme>(getStoredTheme())

  const select = (value: Theme): void => {
    setTheme(value)
    setThemeState(value)
  }

  return (
    <div className="flex items-center gap-1 rounded-md border border-border bg-background/40 p-1">
      {OPTIONS.map(({ value, icon: Icon, key }) => (
        <button
          key={value}
          type="button"
          aria-label={t(key)}
          aria-pressed={theme === value}
          onClick={() => select(value)}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded px-2 py-1 text-xs transition-colors',
            theme === value
              ? 'bg-primary/15 text-primary'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Icon className="size-3.5" />
          {t(key)}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- ThemeSwitcher`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/components/ThemeSwitcher.tsx src/renderer/src/components/ThemeSwitcher.test.tsx src/renderer/src/i18n/locales
git commit -m "feat(theme): add ThemeSwitcher segmented control + i18n"
```

---

### Task 5: Place ThemeSwitcher in the sidebar footer

**Files:**
- Modify: `src/renderer/src/components/Sidebar.tsx`

- [ ] **Step 1: Import the component**

In `src/renderer/src/components/Sidebar.tsx`, add the import next to the existing `VersionBadge` import:

```tsx
import { VersionBadge } from './VersionBadge'
import { ThemeSwitcher } from './ThemeSwitcher'
```

- [ ] **Step 2: Render it in the footer, above the version badge**

Replace the footer block:

```tsx
      <div className="mt-auto flex flex-col gap-2">
        <LanguageSwitcher />
        <ConnectionBar localIp={window.location.hostname || '192.168.1.10'} />
        <VersionBadge />
      </div>
```

with:

```tsx
      <div className="mt-auto flex flex-col gap-2">
        <LanguageSwitcher />
        <ConnectionBar localIp={window.location.hostname || '192.168.1.10'} />
        <ThemeSwitcher />
        <VersionBadge />
      </div>
```

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: PASS — all suites green (the existing App/Sidebar suites still pass; new theme suites included).

- [ ] **Step 4: Commit**

```bash
git add src/renderer/src/components/Sidebar.tsx
git commit -m "feat(theme): show ThemeSwitcher in the sidebar footer"
```

---

### Task 6: Verify on device, then ship

**Files:** none (verification + release)

- [ ] **Step 1: Validate all four locale JSON files parse**

Run:
```bash
for f in en pt es zh; do node -e "JSON.parse(require('fs').readFileSync('src/renderer/src/i18n/locales/$f.json'))" && echo "$f ok"; done
```
Expected: `en ok` / `pt ok` / `es ok` / `zh ok`.

- [ ] **Step 2: Lint + build**

Run: `npm run lint && npm run build`
Expected: lint clean, `✓ built`.

- [ ] **Step 3: Visually verify light + dark on the running app (CDP)**

Launch the built app with a remote debugging port, then drive the renderer to click Light and Dark and screenshot each (the established CDP pattern — `node` + `ws` + `Page.captureScreenshot`, because macOS `screencapture` is denied screen-recording permission):

```bash
pkill -f Electron 2>/dev/null; sleep 1
nohup npx electron . --remote-debugging-port=9236 >/tmp/th.log 2>&1 &
sleep 9
```

Then via a CDP script: click the button with text "Light", confirm `document.documentElement.classList.contains('dark') === false`, screenshot to `/tmp/theme-light.png`; click "Dark", confirm the class is back, screenshot to `/tmp/theme-dark.png`. Read both screenshots and confirm the app actually restyles (light background in one, cyber-dark in the other) and the sidebar shows the Light/Dark/System control next to the version. This verification is **read-only** — it does not touch the connected MiSTer.

Expected: light screenshot shows a light UI; dark screenshot shows the original cyber-dark UI; toggle persists.

- [ ] **Step 4: Kill the app and bump the version**

```bash
pkill -f Electron 2>/dev/null
# bump package.json "version" to the next patch (e.g. 0.2.20)
```

- [ ] **Step 5: Commit, tag, and push (triggers the release chain)**

```bash
git add package.json package-lock.json
git commit -m "chore: bump to 0.2.20 (light/dark theme)"
git push origin main
git tag -a v0.2.20 -m "v0.2.20 — light/dark/system theme toggle"
git push origin v0.2.20
```

Then watch the build run, let `update-cask.yml` bump the tap, and `brew upgrade --cask mister-companion`. (The CI publish race was fixed by the `create-release` job, so the macOS dmg will publish.)

---

## Self-Review

**1. Spec coverage:**
- "Adicionar modo dark e modo light" → Tasks 1–5 (theme module, CSS split, boot apply, switcher, sidebar placement). ✅ Includes a third `system` option (common, low-cost) — Light/Dark are the required two.
- "Ali naquela região, próximo à versão e a atualização da barra lateral" → Task 5 places `<ThemeSwitcher />` directly above `<VersionBadge />` in the same footer cluster. ✅
- "Persistido / aplica no boot" → Task 1 (`setTheme` → localStorage) + Task 3 (`initTheme` on boot). ✅
- Feature suggestions → delivered separately in chat as a researched menu (not plan tasks; the user will pick the next one to spec). ✅

**2. Placeholder scan:** No TBD/TODO/"handle edge cases"/"similar to". Every code step shows complete code. ✅

**3. Type consistency:** `Theme` type and `getStoredTheme`/`setTheme`/`applyTheme`/`resolveTheme`/`initTheme` signatures are identical across `theme.ts`, `theme.test.ts`, `ThemeSwitcher.tsx`, and `main.tsx`. i18n keys `theme.light`/`theme.dark`/`theme.system` are referenced consistently in `ThemeSwitcher.tsx` and defined in all four locales. localStorage key is `'theme'` everywhere. ✅
