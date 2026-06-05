import { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { Play, Power, Search, DatabaseZap, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { api } from '../api'
import type { GameResult, IndexStatus } from '@shared/types'
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
  const { t } = useTranslation()

  // Game library state
  const [indexed, setIndexed] = useState<boolean | null>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GameResult[]>([])
  const [searching, setSearching] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [indexProgress, setIndexProgress] = useState<IndexStatus | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const unsubRef = useRef<(() => void) | null>(null)

  const checkIndex = useCallback(async () => {
    const systems = await api.searchSystems()
    setIndexed(systems.length > 0)
  }, [])

  useEffect(() => {
    void checkIndex()
    // Subscribe to live index status updates
    const unsub = api.onIndexStatus((s: IndexStatus) => {
      setIndexProgress(s)
      if (s.exists && !s.indexing) {
        setGenerating(false)
        void checkIndex()
      }
    })
    unsubRef.current = unsub
    return () => {
      unsub()
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [checkIndex])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) {
      setResults([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      const found = await api.searchGames(query, 'all')
      setResults(found)
      setSearching(false)
    }, 350)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  const handleGenerate = async () => {
    setGenerating(true)
    setIndexProgress(null)
    await api.generateIndex()
  }

  const handleLaunch = (path: string) => {
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

      {/* Game Library Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="size-4 text-primary" /> {t('games.library')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {indexed === null ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
            </div>
          ) : indexed ? (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  className="pl-9"
                  placeholder={t('games.searchPlaceholder')}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              {searching && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                </div>
              )}
              {!searching && query.trim() && results.length === 0 && (
                <p className="text-sm text-muted-foreground">{t('games.noResults')}</p>
              )}
              {results.length > 0 && (
                <ul className="divide-y rounded-md border">
                  {results.map((r, i) => (
                    <li key={`${r.path}-${i}`} className="flex items-center justify-between gap-3 px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{r.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{r.systemName}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="shrink-0"
                        onClick={() => handleLaunch(r.path)}
                      >
                        <Play className="size-3 mr-1" />
                        {t('games.launch')}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{t('games.noIndex')}</p>
              {generating ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    {indexProgress
                      ? t('games.indexing', {
                          current: indexProgress.current,
                          total: indexProgress.total,
                          desc: indexProgress.desc
                        })
                      : t('games.generateIndex')}
                  </div>
                </div>
              ) : (
                <Button onClick={handleGenerate} variant="outline">
                  <DatabaseZap className="size-4 mr-2" />
                  {t('games.generateIndex')}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Power Card */}
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
