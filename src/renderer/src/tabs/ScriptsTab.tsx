import { useEffect, useRef, useState } from 'react'
import { Play, TerminalSquare } from 'lucide-react'
import { api } from '../api'
import { ScriptDef } from '@shared/types'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { ScrollArea } from '../components/ui/scroll-area'

export function ScriptsTab(): JSX.Element {
  const [scripts, setScripts] = useState<ScriptDef[]>([])
  const [output, setOutput] = useState('')
  const [running, setRunning] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api.listScripts().then(setScripts)
    const unsub = api.onScriptOutput((o) => setOutput((prev) => prev + o.chunk))
    return unsub
  }, [])

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
        <h1 className="text-2xl font-bold tracking-tight">Scripts</h1>
        <p className="text-sm text-muted-foreground">Run MiSTer system scripts over SSH</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {scripts.map((s) => (
          <Card key={s.id} className="transition-shadow hover:shadow-glow">
            <CardContent className="flex h-full flex-col gap-3 p-4">
              <div className="font-medium">{s.label}</div>
              <div className="flex-1 text-xs text-muted-foreground">{s.description}</div>
              <Button size="sm" variant="secondary" onClick={() => run(s)} disabled={running !== null}>
                <Play /> Run {s.label}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center gap-2 border-b border-border px-4 py-2 text-xs text-muted-foreground">
            <TerminalSquare className="size-4" /> Output
          </div>
          <ScrollArea className="h-64">
            <pre className="whitespace-pre-wrap p-4 font-mono text-xs text-foreground/90">
              {output || 'No output yet — run a script to see live logs.'}
              <div ref={endRef} />
            </pre>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
