import { useEffect, useRef, useState } from 'react'
import { Search, Play, Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { api } from '../api'
import { GameResult } from '@shared/types'
import { Dialog, DialogContent, DialogTitle } from './ui/dialog'
import { getRecents, addRecent } from '../lib/library-store'

// Global quick-launcher (Cmd/Ctrl+K). Empty query shows recents; typing searches the
// whole library and Enter/click launches.
export function CommandPalette({
  open,
  onOpenChange
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
}): JSX.Element {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GameResult[]>([])
  const [recents, setRecents] = useState<GameResult[]>([])
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (open) {
      setRecents(getRecents())
      setQuery('')
      setResults([])
    }
  }, [open])

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current)
    if (!query.trim()) {
      setResults([])
      return
    }
    debounce.current = setTimeout(async () => setResults(await api.searchGames(query, 'all')), 250)
    return () => {
      if (debounce.current) clearTimeout(debounce.current)
    }
  }, [query])

  const launch = (g: GameResult): void => {
    void api.launchGame(g.path)
    addRecent(g)
    toast.success(t('control.launchSent'), { description: g.name })
    onOpenChange(false)
  }

  const list = query.trim() ? results : recents

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">{t('palette.placeholder')}</DialogTitle>
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && list[0]) launch(list[0])
            }}
            placeholder={t('palette.placeholder')}
            className="flex-1 bg-transparent py-3.5 text-sm outline-none"
          />
        </div>
        <div className="max-h-80 overflow-y-auto p-1">
          {list.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              {query.trim() ? t('games.noResults') : t('palette.hint')}
            </p>
          ) : (
            <>
              {!query.trim() && (
                <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('games.recents')}
                </p>
              )}
              {list.map((g, i) => (
                <button
                  key={`${g.path}-${i}`}
                  onClick={() => launch(g)}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  {query.trim() ? (
                    <Play className="size-3.5 shrink-0 text-muted-foreground" />
                  ) : (
                    <Clock className="size-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <span className="min-w-0 flex-1 truncate">{g.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{g.systemName}</span>
                </button>
              ))}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
