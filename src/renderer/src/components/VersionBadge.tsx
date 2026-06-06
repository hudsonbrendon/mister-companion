import { useEffect, useState } from 'react'
import { ArrowUpCircle, CheckCircle2, Download, Loader2, RefreshCw } from 'lucide-react'
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

type Phase = 'confirm' | 'running' | 'done' | 'error'

// Sidebar footer: shows the running version and, when a newer GitHub release exists, an
// Update button. Confirming runs an internal `brew upgrade` (streamed live) and offers a
// relaunch. Copies without Homebrew fall back to opening the download page.
export function VersionBadge(): JSX.Element {
  const { t } = useTranslation()
  const [info, setInfo] = useState<UpdateInfo | null>(null)
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<Phase>('confirm')
  const [log, setLog] = useState<string[]>([])
  const [failMsg, setFailMsg] = useState('')

  useEffect(() => {
    Promise.resolve(api.checkUpdate?.())
      .then((u) => u && setInfo(u))
      .catch(() => {})
  }, [])

  const openDialog = (): void => {
    setPhase('confirm')
    setLog([])
    setFailMsg('')
    setOpen(true)
  }

  const runUpdate = async (): Promise<void> => {
    setPhase('running')
    setLog([])
    const off = api.onSelfUpdateOutput?.((line) => setLog((l) => [...l, line]))
    try {
      const r = await api.selfUpdate()
      if (r.ok) setPhase('done')
      else {
        setFailMsg(r.message)
        setPhase('error')
      }
    } catch (e) {
      setFailMsg(String(e))
      setPhase('error')
    } finally {
      off?.()
    }
  }

  const brewMissing = phase === 'error' && failMsg === 'brew-not-found'
  const showLog = phase === 'running' || (phase !== 'confirm' && !brewMissing && log.length > 0)

  return (
    <div className="flex items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
      <span className="font-mono">v{info?.current ?? '—'}</span>

      {info?.hasUpdate ? (
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
          onClick={openDialog}
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

      <Dialog open={open} onOpenChange={(o) => phase !== 'running' && setOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {phase === 'done'
                ? t('update.updateDone')
                : phase === 'error'
                  ? t('update.updateFailed')
                  : t('update.confirmTitle')}
            </DialogTitle>
            {phase === 'confirm' && (
              <DialogDescription>
                {t('update.confirmDesc', { version: info?.latest ?? '' })}
              </DialogDescription>
            )}
            {brewMissing && <DialogDescription>{t('update.brewNotFound')}</DialogDescription>}
          </DialogHeader>

          {showLog && (
            <pre className="max-h-48 overflow-auto rounded-md border border-border bg-background/60 p-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
              {log.join('\n') || '…'}
            </pre>
          )}

          <div className="flex justify-end gap-2">
            {phase === 'confirm' && (
              <>
                <DialogClose asChild>
                  <Button variant="ghost">{t('update.cancel')}</Button>
                </DialogClose>
                <Button onClick={runUpdate}>
                  <Download /> {t('update.confirmCta')}
                </Button>
              </>
            )}
            {phase === 'running' && (
              <Button disabled>
                <Loader2 className="animate-spin" /> {t('update.updating')}
              </Button>
            )}
            {phase === 'done' && (
              <Button onClick={() => void api.relaunchApp()}>
                <RefreshCw /> {t('update.relaunch')}
              </Button>
            )}
            {phase === 'error' && (
              <>
                <DialogClose asChild>
                  <Button variant="ghost">{t('update.cancel')}</Button>
                </DialogClose>
                {brewMissing && info?.url && (
                  <Button onClick={() => void api.openExternal(info.url)}>
                    <Download /> {t('update.openDownload')}
                  </Button>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
