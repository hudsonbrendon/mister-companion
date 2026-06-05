import { useEffect, useState } from 'react'
import { ArrowUpCircle, CheckCircle2, Download } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { api } from '../api'
import { UpdateInfo } from '@shared/types'
import { Button } from './ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose
} from './ui/dialog'

// Sidebar footer: always shows the running version, and — when a newer GitHub release
// exists — an "Update" button that opens a confirmation modal. (The unsigned macOS build
// can't self-apply, so confirming opens the download/release page.)
export function VersionBadge(): JSX.Element {
  const { t } = useTranslation()
  const [info, setInfo] = useState<UpdateInfo | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    Promise.resolve(api.checkUpdate?.())
      .then((u) => u && setInfo(u))
      .catch(() => {})
  }, [])

  const confirm = (): void => {
    if (info?.url) void api.openExternal(info.url)
    setOpen(false)
  }

  return (
    <div className="flex items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
      <span className="font-mono">v{info?.current ?? '—'}</span>

      {info?.hasUpdate ? (
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
          onClick={() => setOpen(true)}
        >
          <ArrowUpCircle className="size-3.5" />
          {t('update.update')}
        </Button>
      ) : info ? (
        <span className="flex items-center gap-1">
          <CheckCircle2 className="size-3.5 text-primary/70" />
          {t('update.upToDate')}
        </span>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('update.confirmTitle')}</DialogTitle>
            <DialogDescription>
              {t('update.confirmDesc', { version: info?.latest ?? '' })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="ghost">{t('update.cancel')}</Button>
            </DialogClose>
            <Button onClick={confirm}>
              <Download /> {t('update.confirmCta')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
