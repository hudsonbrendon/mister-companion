import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import {
  Play,
  Search,
  DatabaseZap,
  Loader2,
  ChevronLeft,
  Gamepad2,
  Monitor,
  Cpu,
  Boxes,
  Info
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { api } from '../api'
import type { GameResult, GameSystem, IndexStatus } from '@shared/types'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { ScrollArea } from '../components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose
} from '../components/ui/dialog'

const RESULT_CAP = 500

// Category → icon (the mrext /api/systems `category` is Console / Computer / Other).
const CAT_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  Console: Gamepad2,
  Computer: Cpu,
  Other: Boxes
}
const CAT_ORDER = ['Console', 'Computer', 'Other']

function formatOf(path: string): string {
  const ext = path.split('.').pop() ?? ''
  return ext && ext.length <= 5 ? ext.toUpperCase() : '—'
}

export function GamesTab(): JSX.Element {
  const { t } = useTranslation()

  const [indexed, setIndexed] = useState<boolean | null>(null)
  const [systems, setSystems] = useState<GameSystem[]>([])
  const [generating, setGenerating] = useState(false)
  const [indexProgress, setIndexProgress] = useState<IndexStatus | null>(null)

  // Global search (across all systems).
  const [globalQuery, setGlobalQuery] = useState('')
  const [globalResults, setGlobalResults] = useState<GameResult[]>([])

  // Per-platform browsing.
  const [selectedSystem, setSelectedSystem] = useState<GameSystem | null>(null)
  const [games, setGames] = useState<GameResult[]>([])
  const [systemFilter, setSystemFilter] = useState('')
  const [loadingGames, setLoadingGames] = useState(false)

  const [detail, setDetail] = useState<GameResult | null>(null)

  const globalDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const filterDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refresh = useCallback(async () => {
    const [idx, all] = await Promise.all([api.searchSystems(), api.listSystems()])
    setIndexed(idx.length > 0)
    setSystems(all)
  }, [])

  useEffect(() => {
    void refresh()
    const unsub = api.onIndexStatus((s: IndexStatus) => {
      setIndexProgress(s)
      if (s.exists && !s.indexing) {
        setGenerating(false)
        void refresh()
      }
    })
    return unsub
  }, [refresh])

  // Debounced global search.
  useEffect(() => {
    if (globalDebounce.current) clearTimeout(globalDebounce.current)
    if (!globalQuery.trim()) {
      setGlobalResults([])
      return
    }
    globalDebounce.current = setTimeout(async () => {
      setGlobalResults(await api.searchGames(globalQuery, 'all'))
    }, 350)
    return () => {
      if (globalDebounce.current) clearTimeout(globalDebounce.current)
    }
  }, [globalQuery])

  // Load a platform's games (empty query lists all, capped server-side).
  const openSystem = (sys: GameSystem): void => {
    setSelectedSystem(sys)
    setSystemFilter('')
    setLoadingGames(true)
    void api.searchGames('', sys.id).then((g) => {
      setGames(g)
      setLoadingGames(false)
    })
  }

  // Debounced name filter within the selected platform (re-queries the device).
  useEffect(() => {
    if (!selectedSystem) return
    if (filterDebounce.current) clearTimeout(filterDebounce.current)
    filterDebounce.current = setTimeout(async () => {
      setLoadingGames(true)
      setGames(await api.searchGames(systemFilter, selectedSystem.id))
      setLoadingGames(false)
    }, 300)
    return () => {
      if (filterDebounce.current) clearTimeout(filterDebounce.current)
    }
  }, [systemFilter])

  const grouped = useMemo(() => {
    const byCat = new Map<string, GameSystem[]>()
    for (const s of systems) {
      const cat = s.category || 'Other'
      if (!byCat.has(cat)) byCat.set(cat, [])
      byCat.get(cat)!.push(s)
    }
    const cats = [...byCat.keys()].sort(
      (a, b) => (CAT_ORDER.indexOf(a) + 1 || 99) - (CAT_ORDER.indexOf(b) + 1 || 99)
    )
    return cats.map((cat) => ({
      cat,
      list: byCat.get(cat)!.slice().sort((a, b) => a.name.localeCompare(b.name))
    }))
  }, [systems])

  const handleGenerate = async (): Promise<void> => {
    setGenerating(true)
    setIndexProgress(null)
    await api.generateIndex()
  }

  const launch = (path: string): void => {
    void api.launchGame(path)
    toast.success(t('control.launchSent'), { description: path })
  }

  const catLabel = (cat: string): string => t(`games.cat.${cat.toLowerCase()}`, { defaultValue: cat })

  const header = (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{t('nav.games')}</h1>
      <p className="text-sm text-muted-foreground">{t('games.subtitle')}</p>
    </div>
  )

  // --- Not indexed yet: offer to build the index ---
  if (indexed === false) {
    return (
      <div className="space-y-6">
        {header}
        <Card>
          <CardContent className="space-y-3 p-6">
            <p className="text-sm text-muted-foreground">{t('games.noIndex')}</p>
            {generating ? (
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
            ) : (
              <Button onClick={handleGenerate} variant="outline">
                <DatabaseZap className="size-4" /> {t('games.generateIndex')}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  const gameRow = (r: GameResult, key: string): JSX.Element => (
    <li key={key} className="group flex items-center hover:bg-accent">
      <button
        onClick={() => setDetail(r)}
        className="flex flex-1 items-center gap-3 px-4 py-2.5 text-left text-sm"
      >
        <Gamepad2 className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{r.name}</span>
          <span className="block truncate text-xs text-muted-foreground">{r.systemName}</span>
        </span>
        <span className="shrink-0 rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-secondary-foreground">
          {formatOf(r.path)}
        </span>
      </button>
      <Button
        size="sm"
        variant="ghost"
        className="mr-2 shrink-0 opacity-0 group-hover:opacity-100"
        onClick={() => launch(r.path)}
      >
        <Play className="size-3" /> {t('games.launch')}
      </Button>
    </li>
  )

  const capHint = (n: number): JSX.Element | null =>
    n >= RESULT_CAP ? (
      <p className="px-4 py-2 text-xs text-muted-foreground">{t('games.showingFirst', { n: RESULT_CAP })}</p>
    ) : null

  return (
    <div className="space-y-6">
      {header}

      {/* Global search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder={t('games.searchAll')}
          value={globalQuery}
          onChange={(e) => setGlobalQuery(e.target.value)}
        />
      </div>

      {globalQuery.trim() ? (
        /* --- Global search results --- */
        <Card>
          <CardContent className="p-0">
            {globalResults.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">{t('games.noResults')}</p>
            ) : (
              <ScrollArea className="h-[28rem]">
                <ul className="divide-y divide-border">
                  {globalResults.map((r, i) => gameRow(r, `${r.path}-${i}`))}
                </ul>
                {capHint(globalResults.length)}
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      ) : selectedSystem ? (
        /* --- One platform's games --- */
        <Card>
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Button size="sm" variant="ghost" onClick={() => setSelectedSystem(null)}>
              <ChevronLeft className="size-4" /> {t('games.backToPlatforms')}
            </Button>
            <span className="font-semibold">{selectedSystem.name}</span>
            <div className="relative ml-auto w-56">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-8 pl-8 text-xs"
                placeholder={t('games.filterPlaceholder')}
                value={systemFilter}
                onChange={(e) => setSystemFilter(e.target.value)}
              />
            </div>
          </div>
          <CardContent className="p-0">
            {loadingGames ? (
              <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
              </div>
            ) : games.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">{t('games.noResults')}</p>
            ) : (
              <ScrollArea className="h-[28rem]">
                <ul className="divide-y divide-border">
                  {games.map((r, i) => gameRow(r, `${r.path}-${i}`))}
                </ul>
                {capHint(games.length)}
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      ) : (
        /* --- Platforms grouped by category --- */
        <div className="space-y-6">
          {indexed === null ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
            </div>
          ) : (
            grouped.map(({ cat, list }) => {
              const CatIcon = CAT_ICON[cat] ?? Monitor
              return (
                <div key={cat}>
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <CatIcon className="size-3.5" /> {catLabel(cat)}
                    <span className="text-muted-foreground/60">({list.length})</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {list.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => openSystem(s)}
                        className="flex items-center gap-2 rounded-lg border border-border bg-card/60 px-3 py-2.5 text-left text-sm transition-colors hover:border-primary/50 hover:bg-accent"
                      >
                        <Gamepad2 className="size-4 shrink-0 text-primary" />
                        <span className="truncate">{s.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Game detail */}
      <Dialog open={detail !== null} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="truncate pr-6">{detail?.name}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="flex items-center justify-center rounded-lg border border-border bg-background/60 py-10">
                <Gamepad2 className="size-16 text-muted-foreground/40" />
              </div>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{t('games.platform')}</dt>
                  <dd className="truncate font-medium">{detail.systemName}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{t('games.format')}</dt>
                  <dd className="font-mono">{formatOf(detail.path)}</dd>
                </div>
                <div className="gap-1">
                  <dt className="text-muted-foreground">{t('games.path')}</dt>
                  <dd className="mt-0.5 break-all font-mono text-xs text-muted-foreground">{detail.path}</dd>
                </div>
              </dl>
              <p className="flex items-start gap-1.5 text-xs text-muted-foreground/80">
                <Info className="mt-0.5 size-3.5 shrink-0" /> {t('games.noMetadata')}
              </p>
              <div className="flex justify-end gap-2">
                <DialogClose asChild>
                  <Button variant="ghost">{t('games.close')}</Button>
                </DialogClose>
                <Button onClick={() => detail && launch(detail.path)}>
                  <Play /> {t('games.launch')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
