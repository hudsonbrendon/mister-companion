import { useEffect, useMemo, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Loader2, Save, RotateCcw, Check, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { api } from '../api'
import { IniProfile } from '@shared/types'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { ScrollArea } from '../components/ui/scroll-area'
import { cn } from '../lib/utils'

export function SettingsTab(): JSX.Element {
  const { t } = useTranslation()
  const [inis, setInis] = useState<IniProfile[]>([])
  const [activeId, setActiveId] = useState(0)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadIni = useCallback(async (id: number) => {
    setLoading(true)
    setFilter('')
    const v = await api.readIni(id)
    setValues(v)
    setEdits({ ...v })
    setLoading(false)
  }, [])

  useEffect(() => {
    void (async () => {
      const data = await api.listInis()
      setInis(data.inis)
      setActiveId(data.active)
      const first = data.active >= 1 ? data.active : (data.inis[0]?.id ?? null)
      setSelectedId(first)
      if (first != null) await loadIni(first)
      else setLoading(false)
    })()
  }, [loadIni])

  // __-prefixed keys are read-only device metadata; the rest are editable settings.
  const metaKeys = useMemo(() => Object.keys(values).filter((k) => k.startsWith('__')).sort(), [values])
  const editableKeys = useMemo(
    () => Object.keys(values).filter((k) => !k.startsWith('__')).sort(),
    [values]
  )
  const shownKeys = useMemo(
    () => editableKeys.filter((k) => k.toLowerCase().includes(filter.toLowerCase().trim())),
    [editableKeys, filter]
  )
  const changed = useMemo(
    () => editableKeys.filter((k) => edits[k] !== values[k]),
    [editableKeys, edits, values]
  )

  const select = (id: number): void => {
    setSelectedId(id)
    void loadIni(id)
  }

  const makeActive = async (id: number): Promise<void> => {
    try {
      await api.setActiveIni(id)
      setActiveId(id)
      toast.success(t('settings.madeActive'))
    } catch (e) {
      toast.error(String(e))
    }
  }

  const save = async (): Promise<void> => {
    if (selectedId == null || changed.length === 0) return
    setSaving(true)
    try {
      const diff: Record<string, string> = {}
      for (const k of changed) diff[k] = edits[k]
      await api.writeIni(selectedId, diff)
      setValues({ ...values, ...diff })
      toast.success(t('settings.saved'), { description: `${changed.length}` })
    } catch (e) {
      toast.error(String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('nav.settings')}</h1>
        <p className="text-sm text-muted-foreground">{t('settings.subtitle')}</p>
      </div>

      {/* Profiles */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('settings.profiles')}
        </span>
        {inis.map((p) => (
          <button
            key={p.id}
            onClick={() => select(p.id)}
            className={cn(
              'flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors',
              selectedId === p.id
                ? 'border-primary bg-primary/15 text-primary'
                : 'border-border hover:bg-accent'
            )}
          >
            {p.displayName}
            {activeId === p.id && (
              <span className="rounded bg-primary px-1 py-0.5 text-[9px] font-medium text-primary-foreground">
                {t('settings.active')}
              </span>
            )}
          </button>
        ))}
        {selectedId != null && activeId !== selectedId && (
          <Button size="sm" variant="outline" onClick={() => makeActive(selectedId)}>
            <Check className="size-4" /> {t('settings.makeActive')}
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          {loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
            </div>
          ) : (
            <>
              {/* Read-only device metadata */}
              {metaKeys.length > 0 && (
                <div className="flex flex-wrap gap-x-6 gap-y-1 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  {metaKeys.map((k) => (
                    <span key={k}>
                      <span className="font-medium">{k.replace(/^__/, '')}:</span>{' '}
                      <span className="font-mono">{values[k]}</span>
                    </span>
                  ))}
                </div>
              )}

              {/* Filter */}
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder={t('settings.filterPlaceholder')}
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
              </div>

              {/* Key/value editor */}
              <ScrollArea className="h-[22rem]">
                <div className="space-y-1 pr-3">
                  {shownKeys.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">{t('settings.empty')}</p>
                  ) : (
                    shownKeys.map((k) => (
                      <div
                        key={k}
                        className={cn(
                          'grid grid-cols-[1fr_10rem] items-center gap-3 rounded px-2 py-1',
                          edits[k] !== values[k] && 'bg-primary/5'
                        )}
                      >
                        <label htmlFor={`ini-${k}`} className="truncate font-mono text-xs" title={k}>
                          {k}
                        </label>
                        <Input
                          id={`ini-${k}`}
                          className="h-8 text-xs"
                          value={edits[k] ?? ''}
                          onChange={(e) => setEdits((p) => ({ ...p, [k]: e.target.value }))}
                        />
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-border pt-3">
                <span className="text-xs text-muted-foreground">
                  {changed.length > 0
                    ? t('settings.changes', { n: changed.length })
                    : t('settings.noChanges')}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={changed.length === 0}
                    onClick={() => setEdits({ ...values })}
                  >
                    <RotateCcw className="size-4" /> {t('settings.reset')}
                  </Button>
                  <Button size="sm" disabled={changed.length === 0 || saving} onClick={save}>
                    {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}{' '}
                    {t('settings.save')}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
