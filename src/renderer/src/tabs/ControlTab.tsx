import { useState } from 'react'
import { toast } from 'sonner'
import { Play, Power } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { api } from '../api'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose
} from '../components/ui/dialog'

export function ControlTab(): JSX.Element {
  const [path, setPath] = useState('')
  const { t } = useTranslation()

  const launch = () => {
    api.launchGame(path)
    toast.success(t('control.launchSent'), { description: path })
  }

  const doReboot = async () => {
    await api.reboot()
    toast.success(t('control.rebootSent'))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('nav.control')}</h1>
        <p className="text-sm text-muted-foreground">{t('control.subtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Play className="size-4 text-primary" /> {t('control.launchTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Input
            placeholder={t('control.pathPlaceholder')}
            value={path}
            onChange={(e) => setPath(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && path && launch()}
          />
          <Button onClick={launch} disabled={!path}>
            {t('control.launch')}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
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
                <DialogDescription>
                  {t('control.rebootConfirmDesc')}
                </DialogDescription>
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
