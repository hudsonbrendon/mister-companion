import { useEffect, useRef, useState } from 'react'
import { Play, TerminalSquare, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { api } from '../api'
import { ScriptDef } from '@shared/types'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { ScrollArea } from '../components/ui/scroll-area'

export function ScriptsTab(): JSX.Element {
  const [scripts, setScripts] = useState<ScriptDef[]>([])
  const [filter, setFilter] = useState('')
  const [output, setOutput] = useState('')
  const [running, setRunning] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const { t } = useTranslation()

  useEffect(() => {
    api.listScripts().then(setScripts)
    const unsub = api.onScriptOutput((o) => setOutput((prev) => prev + o.chunk))
    return unsub
  }, [])

  const shown = scripts.filter((s) => s.label.toLowerCase().includes(filter.toLowerCase().trim()))

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [output])

  const run = (s: ScriptDef) => {
    setOutput('')
    setRunning(s.id)
    api.runScript(s.id).finally(() => setRunning(null))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('nav.scripts')}</h1>
        <p className="text-sm text-muted-foreground">{t('scripts.subtitle')}</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder={t('scripts.filterPlaceholder')}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('scripts.empty')}</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((s) => (
            <Card key={s.id} className="transition-shadow hover:shadow-glow">
              <CardContent className="flex h-full flex-col gap-3 p-4">
                <div className="truncate font-medium" title={s.label}>
                  {s.label}
                </div>
                <div className="flex-1 break-all font-mono text-[11px] text-muted-foreground">
                  {s.description}
                </div>
                <Button size="sm" variant="secondary" onClick={() => run(s)} disabled={running !== null}>
                  <Play /> {t('scripts.run', { label: s.label })}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center gap-2 border-b border-border px-4 py-2 text-xs text-muted-foreground">
            <TerminalSquare className="size-4" /> {t('scripts.output')}
          </div>
          <ScrollArea className="h-64">
            <pre className="whitespace-pre-wrap p-4 font-mono text-xs text-foreground/90">
              {output || t('scripts.noOutput')}
              <div ref={endRef} />
            </pre>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
