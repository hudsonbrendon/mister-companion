import { useCallback, useEffect, useState } from 'react'
import { ArrowUp, Folder, File as FileIcon, AlertTriangle, Loader2 } from 'lucide-react'
import { api } from '../api'
import { SmbEntry } from '@shared/types'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { ScrollArea } from '../components/ui/scroll-area'
import { gb } from '../lib/format'

const SHARE = 'sdcard'

export function FilesTab(): JSX.Element {
  const [path, setPath] = useState('')
  const [entries, setEntries] = useState<SmbEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback((p: string) => {
    setLoading(true)
    api
      .smbList(SHARE, p)
      .then((e) => {
        setEntries(e)
        setError(null)
      })
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load(path)
  }, [path, load])

  const open = (entry: SmbEntry) => {
    if (entry.isDirectory) setPath(path ? `${path}/${entry.name}` : entry.name)
  }
  const up = () => setPath(path.split('/').slice(0, -1).join('/'))
  const crumbs = path ? path.split('/') : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Files</h1>
        <p className="text-sm text-muted-foreground">Browse the SD card over SSH</p>
      </div>

      <Card>
        <div className="flex items-center gap-2 border-b border-border px-4 py-2">
          <Button size="icon" variant="ghost" onClick={up} disabled={!path} aria-label="Up">
            <ArrowUp />
          </Button>
          <div className="flex items-center gap-1 font-mono text-sm text-muted-foreground">
            <span>/{SHARE}</span>
            {crumbs.map((c, i) => (
              <span key={i}>/{c}</span>
            ))}
          </div>
          {loading && <Loader2 className="ml-auto size-4 animate-spin text-muted-foreground" />}
        </div>

        <CardContent className="p-0">
          {error ? (
            <div className="flex items-center gap-2 p-6 text-sm text-destructive">
              <AlertTriangle className="size-4" /> {error}
            </div>
          ) : entries.length === 0 && !loading ? (
            <div className="p-6 text-sm text-muted-foreground">Empty folder.</div>
          ) : (
            <ScrollArea className="h-[26rem]">
              <ul className="divide-y divide-border">
                {entries.map((e) => (
                  <li key={e.name}>
                    <button
                      onClick={() => open(e)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-accent"
                    >
                      {e.isDirectory ? (
                        <Folder className="size-4 text-primary" />
                      ) : (
                        <FileIcon className="size-4 text-muted-foreground" />
                      )}
                      <span className="flex-1 truncate">{e.name}</span>
                      {!e.isDirectory && (
                        <span className="font-mono text-xs text-muted-foreground">{gb(e.size)}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
