import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  ArrowUp,
  Folder,
  File as FileIcon,
  AlertTriangle,
  Loader2,
  Trash2,
  Save,
  Download,
  Upload,
  Archive
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { api } from '../api'
import { SmbEntry } from '@shared/types'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { ScrollArea } from '../components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose
} from '../components/ui/dialog'
import { gb } from '../lib/format'

const SHARE = 'sdcard'
const TEXT_RE = /\.(ini|txt|cfg|log|sh|json|md|csv|ya?ml|conf)$/i

export function FilesTab(): JSX.Element {
  const [path, setPath] = useState('')
  const [entries, setEntries] = useState<SmbEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<{ name: string; content: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [toDelete, setToDelete] = useState<SmbEntry | null>(null)
  const { t } = useTranslation()

  const full = (name: string): string => (path ? `${path}/${name}` : name)

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
    if (entry.isDirectory) {
      setPath(full(entry.name))
    } else if (TEXT_RE.test(entry.name)) {
      api
        .readFile(full(entry.name))
        .then((content) => setEditing({ name: entry.name, content }))
        .catch((e) => toast.error(String(e)))
    }
  }

  const save = async () => {
    if (!editing) return
    setSaving(true)
    try {
      await api.writeFile(full(editing.name), editing.content)
      toast.success(t('files.saved'), { description: editing.name })
      setEditing(null)
    } catch (e) {
      toast.error(String(e))
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    const target = toDelete
    setToDelete(null)
    try {
      await api.deleteFile(full(target.name), target.isDirectory)
      load(path)
    } catch (e) {
      toast.error(String(e))
    }
  }

  const download = async (entry: SmbEntry) => {
    try {
      const saved = await api.downloadFile(full(entry.name), entry.name)
      if (saved) toast.success(t('files.downloaded'), { description: entry.name })
    } catch (e) {
      toast.error(String(e))
    }
  }

  const upload = async () => {
    try {
      const n = await api.uploadFiles(path)
      if (n > 0) {
        toast.success(t('files.uploaded', { n }))
        load(path)
      }
    } catch (e) {
      toast.error(String(e))
    }
  }

  const backup = async () => {
    try {
      const saved = await api.backupSaves()
      if (saved) toast.success(t('files.backupDone'))
    } catch (e) {
      toast.error(String(e))
    }
  }

  const up = () => setPath(path.split('/').slice(0, -1).join('/'))
  const crumbs = path ? path.split('/') : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('nav.files')}</h1>
        <p className="text-sm text-muted-foreground">{t('files.subtitle')}</p>
      </div>

      <Card>
        <div className="flex items-center gap-2 border-b border-border px-4 py-2">
          <Button size="icon" variant="ghost" onClick={up} disabled={!path} aria-label={t('files.up')}>
            <ArrowUp />
          </Button>
          <div className="flex items-center gap-1 font-mono text-sm text-muted-foreground">
            <span>/{SHARE}</span>
            {crumbs.map((c, i) => (
              <span key={i}>/{c}</span>
            ))}
          </div>
          {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={upload}>
              <Upload className="size-4" /> {t('files.upload')}
            </Button>
            <Button size="sm" variant="outline" onClick={backup}>
              <Archive className="size-4" /> {t('files.backupSaves')}
            </Button>
          </div>
        </div>

        <CardContent className="p-0">
          {error ? (
            <div className="flex items-center gap-2 p-6 text-sm text-destructive">
              <AlertTriangle className="size-4" /> {error}
            </div>
          ) : entries.length === 0 && !loading ? (
            <div className="p-6 text-sm text-muted-foreground">{t('files.empty')}</div>
          ) : (
            <ScrollArea className="h-[26rem]">
              <ul className="divide-y divide-border">
                {entries.map((e) => (
                  <li key={e.name} className="group flex items-center hover:bg-accent">
                    <button
                      onClick={() => open(e)}
                      className="flex flex-1 items-center gap-3 px-4 py-2.5 text-left text-sm"
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
                    {!e.isDirectory && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 shrink-0 opacity-0 group-hover:opacity-100"
                        onClick={() => download(e)}
                        aria-label={`${t('files.download')} ${e.name}`}
                      >
                        <Download className="size-4 text-muted-foreground" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="mr-2 size-7 shrink-0 opacity-0 group-hover:opacity-100"
                      onClick={() => setToDelete(e)}
                      aria-label={`${t('files.delete')} ${e.name}`}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Text editor */}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-mono">{editing?.name}</DialogTitle>
          </DialogHeader>
          <textarea
            value={editing?.content ?? ''}
            onChange={(e) => setEditing((prev) => (prev ? { ...prev, content: e.target.value } : prev))}
            spellCheck={false}
            className="h-[24rem] w-full resize-none rounded-md border border-input bg-background/60 p-3 font-mono text-xs outline-none focus-visible:border-primary"
          />
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="ghost">{t('files.cancel')}</Button>
            </DialogClose>
            <Button onClick={save} disabled={saving}>
              <Save /> {t('files.save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={toDelete !== null} onOpenChange={(o) => !o && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('files.delete')}</DialogTitle>
            <DialogDescription>{t('files.deleteConfirm', { name: toDelete?.name ?? '' })}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="ghost">{t('files.cancel')}</Button>
            </DialogClose>
            <DialogClose asChild>
              <Button variant="destructive" onClick={confirmDelete}>
                <Trash2 /> {t('files.delete')}
              </Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
