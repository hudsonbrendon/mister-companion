import { Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { LANGUAGES, setLanguage } from '../i18n'

export function LanguageSwitcher(): JSX.Element {
  const { i18n } = useTranslation()
  return (
    <label className="flex items-center gap-2 rounded-md border border-border bg-background/40 px-2 py-1.5 text-xs text-muted-foreground">
      <Languages className="size-4" />
      <select
        aria-label="Language"
        value={i18n.language}
        onChange={(e) => setLanguage(e.target.value)}
        className="flex-1 cursor-pointer bg-transparent text-foreground outline-none"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code} className="bg-card text-foreground">
            {l.label}
          </option>
        ))}
      </select>
    </label>
  )
}
