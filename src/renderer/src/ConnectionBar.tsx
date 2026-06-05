import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Radar, Loader2, Cpu, SearchX, ChevronLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { api } from './api'
import { DiscoveredDevice, MisterProfile } from '@shared/types'
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from './components/ui/dialog'

export function ConnectionBar({ localIp }: { localIp: string }): JSX.Element {
  const [found, setFound] = useState<DiscoveredDevice[]>([])
  const [profiles, setProfiles] = useState<MisterProfile[]>([])
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<DiscoveredDevice | null>(null)
  const [username, setUsername] = useState('root')
  const [password, setPassword] = useState('1')
  const { t } = useTranslation()

  useEffect(() => {
    api.listProfiles().then(setProfiles).catch(() => {})
  }, [])

  const discover = async () => {
    setOpen(true)
    setSelected(null)
    setBusy(true)
    setFound([])
    try {
      setFound(await api.discover(localIp))
    } finally {
      setBusy(false)
    }
  }

  const selectDevice = (d: DiscoveredDevice) => {
    setSelected(d)
    setUsername('root')
    setPassword('1')
  }

  const connectProfile = async (profile: MisterProfile) => {
    try {
      await api.connect(profile)
      // Start (or restart) the live status feed now that a session exists — the feed
      // started on app mount was a no-op because nothing was connected yet.
      await api.startStatusFeed()
      setError(null)
      setOpen(false)
      toast.success(t('connection.connectedTo', { name: profile.name }), { description: profile.host })
    } catch (e) {
      const msg = t('connection.connectFailed', { error: String(e) })
      setError(msg)
      toast.error(msg)
    }
  }

  const connectSelected = () => {
    if (!selected) return
    connectProfile({
      id: selected.host,
      name: selected.hostname ?? selected.host,
      host: selected.host,
      restPort: 8182,
      sshPort: 22,
      sshUser: username,
      sshPassword: password
    })
  }

  return (
    <div className="space-y-2 rounded-lg border border-border bg-background/40 p-3">
      <Button onClick={discover} disabled={busy} size="sm" variant="secondary" className="w-full">
        {busy ? <Loader2 className="animate-spin" /> : <Radar />}
        {busy ? t('common.scanning') : t('common.discover')}
      </Button>

      {error && <div className="text-xs text-destructive">{error}</div>}

      {profiles.length > 0 && (
        <div className="space-y-1 border-t border-border pt-2">
          <div className="px-1 text-[10px] uppercase tracking-wide text-muted-foreground">{t('connection.saved')}</div>
          {profiles.map((p) => (
            <button
              key={p.id}
              onClick={() => connectProfile(p)}
              className="w-full truncate rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent"
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSelected(null) }}>
        <DialogContent>
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle>{t('connection.connectTo', { name: selected.hostname ?? selected.host })}</DialogTitle>
                <DialogDescription className="font-mono">{selected.host}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <label className="block space-y-1">
                  <span className="text-xs text-muted-foreground">{t('connection.username')}</span>
                  <Input value={username} onChange={(e) => setUsername(e.target.value)} />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs text-muted-foreground">{t('connection.password')}</span>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && connectSelected()}
                  />
                </label>
                <div className="flex justify-between gap-2 pt-1">
                  <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
                    <ChevronLeft /> {t('connection.back')}
                  </Button>
                  <Button size="sm" onClick={connectSelected}>
                    {t('connection.connect')}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Radar className="size-5 text-primary" /> {t('connection.discoveredTitle')}
                </DialogTitle>
                <DialogDescription>{t('connection.discoveredDesc')}</DialogDescription>
              </DialogHeader>

              {busy ? (
                <div className="flex flex-col items-center gap-3 py-10 text-sm text-muted-foreground">
                  <Loader2 className="size-7 animate-spin text-primary" />
                  {t('connection.scanningNetwork')}
                </div>
              ) : found.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center text-sm text-muted-foreground">
                  <SearchX className="size-7" />
                  {t('connection.noneFound')}
                  <Button onClick={discover} size="sm" variant="secondary">
                    <Radar /> {t('connection.scanAgain')}
                  </Button>
                </div>
              ) : (
                <ul className="space-y-2">
                  {found.map((d) => (
                    <li key={d.host}>
                      <button
                        onClick={() => selectDevice(d)}
                        className="flex w-full items-center gap-3 rounded-lg border border-border bg-card/60 p-3 text-left transition-all hover:border-primary hover:shadow-glow"
                      >
                        <div className="grid size-9 place-items-center rounded-md bg-primary/15 text-primary">
                          <Cpu className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-medium">{d.hostname ?? d.host}</div>
                          <div className="font-mono text-xs text-muted-foreground">{d.host}</div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
