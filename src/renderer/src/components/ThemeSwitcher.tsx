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
            'flex min-w-0 flex-1 items-center justify-center gap-1 rounded px-1 py-1 text-[10px] transition-colors',
            theme === value
              ? 'bg-primary/15 text-primary'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Icon className="size-3.5 shrink-0" />
          <span className="truncate">{t(key)}</span>
        </button>
      ))}
    </div>
  )
}
