import { toast } from 'sonner'
import { Power } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { api } from '../api'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { RemoteControl } from '../components/RemoteControl'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose
} from '../components/ui/dialog'

// The Control tab is dedicated to the remote control (shown large and centered) plus
// power actions. Game browsing now lives in its own Library tab.
export function ControlTab(): JSX.Element {
  const { t } = useTranslation()

  const doReboot = async (): Promise<void> => {
    await api.reboot()
    toast.success(t('control.rebootSent'))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('nav.control')}</h1>
        <p className="text-sm text-muted-foreground">{t('control.subtitle')}</p>
      </div>

      <RemoteControl />

      <Card className="mx-auto w-full max-w-xl border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Power className="size-4 text-destructive" /> {t('control.power')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="destructive">
                <Power /> {t('control.reboot')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('control.rebootConfirmTitle')}</DialogTitle>
                <DialogDescription>{t('control.rebootConfirmDesc')}</DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2">
                <DialogClose asChild>
                  <Button variant="ghost">{t('control.cancel')}</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button variant="destructive" onClick={doReboot}>
                    {t('control.confirmReboot')}
                  </Button>
                </DialogClose>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  )
}
