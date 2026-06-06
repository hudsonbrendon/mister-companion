import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Camera, Image as ImageIcon, Trash2, Ban, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { api } from '../api'
import { Wallpaper, Screenshot } from '@shared/types'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { ScrollArea } from '../components/ui/scroll-area'
import { MusicPlayer } from '../components/MusicPlayer'
import { cn } from '../lib/utils'

export function MediaTab(): JSX.Element {
  const { t } = useTranslation()
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([])
  const [activeWp, setActiveWp] = useState('')
  const [shots, setShots] = useState<Screenshot[]>([])
  const [taking, setTaking] = useState(false)

  const refresh = useCallback(() => {
    api.getWallpapers().then((d) => {
      setWallpapers(d.wallpapers)
      setActiveWp(d.active)
    }).catch(() => {})
    api.getScreenshots().then(setShots).catch(() => {})
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const setWp = async (w: Wallpaper) => {
    await api.setWallpaper(w.filename)
    toast.success(t('media.set'), { description: w.name })
    refresh()
  }
  const clearWp = async () => { await api.unsetWallpaper(); refresh() }

  // mrext's "take screenshot" can't report success (it just pokes /dev/MiSTer_cmd), and
  // the MiSTer only writes a file when the running core actually supports it. So instead
  // of claiming success blindly, poll the list for a few seconds and confirm a NEW file
  // appeared — otherwise tell the user nothing was captured.
  const take = async () => {
    setTaking(true)
    const before = new Set(shots.map((s) => s.filename))
    try {
      await api.takeScreenshot()
      for (let i = 0; i < 8; i++) {
        await new Promise((r) => setTimeout(r, 800))
        const list = await api.getScreenshots()
        setShots(list)
        if (list.some((s) => !before.has(s.filename))) {
          toast.success(t('media.taken'))
          return
        }
      }
      toast.warning(t('media.noCapture'))
    } finally {
      setTaking(false)
    }
  }

  const del = async (s: Screenshot) => { await api.deleteScreenshot(s.filename); refresh() }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('nav.media')}</h1>
        <p className="text-sm text-muted-foreground">{t('media.subtitle')}</p>
      </div>

      <MusicPlayer />

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Camera className="size-4 text-primary" /> {t('media.screenshots')}
          </CardTitle>
          <Button size="sm" onClick={take} disabled={taking}>
            {taking ? <Loader2 className="animate-spin" /> : <Camera />} {t('media.take')}
          </Button>
        </CardHeader>
        <CardContent>
          {shots.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('media.noScreenshots')}</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {shots.map((s) => (
                <div key={s.filename} className="group relative overflow-hidden rounded-lg border border-border">
                  <img src={s.imageUrl} alt={s.game} loading="lazy" className="aspect-video w-full object-cover" />
                  <div className="truncate px-2 py-1 text-xs text-muted-foreground">{s.game || s.core || s.filename}</div>
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute right-1 top-1 size-7 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={() => del(s)}
                    aria-label="Delete screenshot"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ImageIcon className="size-4 text-primary" /> {t('media.wallpapers')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[28rem]">
            <div className="grid grid-cols-2 gap-3 pr-3 sm:grid-cols-3 lg:grid-cols-4">
              <button
                onClick={clearWp}
                className={cn(
                  'flex aspect-video items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border text-sm text-muted-foreground hover:border-primary hover:text-primary',
                  activeWp === '' && 'border-primary text-primary'
                )}
              >
                <Ban className="size-4" /> {t('media.default')}
              </button>
              {wallpapers.map((w) => (
                <button
                  key={w.filename}
                  onClick={() => setWp(w)}
                  title={w.name}
                  className={cn(
                    'relative overflow-hidden rounded-lg border-2 transition-all hover:border-primary',
                    w.active || w.filename === activeWp ? 'border-primary shadow-glow' : 'border-transparent'
                  )}
                >
                  <img src={w.imageUrl} alt={w.name} loading="lazy" className="aspect-video w-full object-cover" />
                  {(w.active || w.filename === activeWp) && (
                    <span className="absolute right-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                      {t('media.active')}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
