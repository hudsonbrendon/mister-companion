import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { api } from '../api'
import { Button } from './ui/button'

// Checks the latest GitHub release on mount and shows a dismissible banner when a newer
// version exists. (Silent self-apply isn't possible on the unsigned macOS build, so this
// links to the release / `brew upgrade` instead.)
export function UpdateBanner(): JSX.Element | null {
  const { t } = useTranslation()
  const [info, setInfo] = useState<{ latest: string; url: string } | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    Promise.resolve(api.checkUpdate?.())
      .then((u) => {
        if (u && u.hasUpdate) setInfo({ latest: u.latest, url: u.url })
      })
      .catch(() => {})
  }, [])

  if (!info || dismissed) return null
  return (
    <div className="flex items-center gap-3 border-b border-primary/30 bg-primary/10 px-6 py-2 text-sm">
      <Download className="size-4 shrink-0 text-primary" />
      <span className="flex-1">{t('update.available', { version: info.latest })}</span>
      {info.url && (
        <Button size="sm" onClick={() => void api.openExternal(info.url)}>
          {t('update.view')}
        </Button>
      )}
      <Button
        size="icon"
        variant="ghost"
        className="size-7"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
      >
        <X className="size-4" />
      </Button>
    </div>
  )
}
