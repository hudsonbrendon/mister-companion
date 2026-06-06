import { useEffect, useState, useCallback } from 'react'
import { Music, Play, Square, SkipForward, Shuffle, Repeat, Ban, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { api } from '../api'
import { MusicStatus } from '@shared/types'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { cn } from '../lib/utils'

const MODES: { value: string; icon: React.ComponentType<{ className?: string }>; key: string }[] = [
  { value: 'random', icon: Shuffle, key: 'music.modeRandom' },
  { value: 'loop', icon: Repeat, key: 'music.modeLoop' },
  { value: 'disabled', icon: Ban, key: 'music.modeDisabled' }
]

// MiSTer background-music (BGM) controls. Polls /music/status while mounted. When the BGM
// service isn't running on the device, shows an explanatory note (controls still post).
export function MusicPlayer(): JSX.Element {
  const { t } = useTranslation()
  const [status, setStatus] = useState<MusicStatus | null>(null)
  const [playlists, setPlaylists] = useState<string[]>([])

  const refresh = useCallback(() => {
    api.musicStatus().then(setStatus).catch(() => {})
  }, [])

  useEffect(() => {
    refresh()
    api.musicPlaylists().then(setPlaylists).catch(() => {})
    const iv = setInterval(refresh, 4000)
    return () => clearInterval(iv)
  }, [refresh])

  const act = (fn: () => Promise<void>) => async (): Promise<void> => {
    try {
      await fn()
    } catch {
      /* ignore — status poll reflects reality */
    } finally {
      setTimeout(refresh, 400)
    }
  }

  const running = status?.running
  const playing = status?.playing

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Music className="size-4 text-primary" /> {t('music.title')}
        </CardTitle>
        {playlists.length > 0 && (
          <select
            value={status?.playlist || ''}
            onChange={(e) => void api.musicSetPlaylist(e.target.value).then(() => setTimeout(refresh, 400))}
            aria-label={t('music.playlist')}
            className="cursor-pointer rounded-md border border-border bg-background/40 px-2 py-1 text-xs text-foreground outline-none"
          >
            {!status?.playlist && <option value="">{t('music.playlist')}</option>}
            {playlists.map((pl) => (
              <option key={pl} value={pl} className="bg-card">
                {pl}
              </option>
            ))}
          </select>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {status === null ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
          </div>
        ) : !running ? (
          <p className="text-sm text-muted-foreground">{t('music.off')}</p>
        ) : (
          <div className="flex items-center gap-3 text-sm">
            <span
              className={cn(
                'size-2 shrink-0 rounded-full',
                playing ? 'animate-pulse bg-primary' : 'bg-muted-foreground/40'
              )}
            />
            <span className="min-w-0 flex-1 truncate">{status.track || t('music.nothingPlaying')}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button size="sm" onClick={act(() => (playing ? api.musicStop() : api.musicPlay()))}>
            {playing ? <Square className="size-4" /> : <Play className="size-4" />}
            {playing ? t('music.stop') : t('music.play')}
          </Button>
          <Button size="sm" variant="outline" onClick={act(() => api.musicNext())}>
            <SkipForward className="size-4" /> {t('music.next')}
          </Button>
          <div className="ml-auto flex items-center gap-1">
            {MODES.map(({ value, icon: Icon, key }) => (
              <Button
                key={value}
                size="icon"
                variant="ghost"
                className={cn('size-8', status?.playback === value && 'bg-primary/15 text-primary')}
                onClick={act(() => api.musicPlayback(value))}
                aria-label={t(key)}
                title={t(key)}
              >
                <Icon className="size-4" />
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
