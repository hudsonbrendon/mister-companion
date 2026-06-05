import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Radar, Loader2, Cpu, SearchX } from 'lucide-react'
import { api } from './api'
import { DiscoveredDevice, MisterProfile } from '@shared/types'
import { Button } from './components/ui/button'
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

  useEffect(() => {
    api.listProfiles().then(setProfiles).catch(() => {})
  }, [])

  const discover = async () => {
    setOpen(true)
    setBusy(true)
    setFound([])
    try {
      setFound(await api.discover(localIp))
    } finally {
      setBusy(false)
    }
  }

  const connectProfile = async (profile: MisterProfile) => {
    try {
      await api.connect(profile)
      // Start (or restart) the live status feed now that a session exists — the feed
      // started on app mount was a no-op because nothing was connected yet.
      await api.startStatusFeed()
      setError(null)
      setOpen(false)
      toast.success(`Connected to ${profile.name}`, { description: profile.host })
    } catch (e) {
      const msg = `Connect failed: ${String(e)}`
      setError(msg)
      toast.error(msg)
    }
  }

  const connectDevice = (d: DiscoveredDevice) =>
    connectProfile({
      id: d.host,
      name: d.hostname ?? d.host,
      host: d.host,
      restPort: 8182,
      sshPort: 22,
      // MiSTer's default Linux credentials — needed for SFTP file browsing and scripts.
      sshUser: 'root',
      sshPassword: '1'
    })

  return (
    <div className="space-y-2 rounded-lg border border-border bg-background/40 p-3">
      <Button onClick={discover} disabled={busy} size="sm" variant="secondary" className="w-full">
        {busy ? <Loader2 className="animate-spin" /> : <Radar />}
        {busy ? 'Scanning…' : 'Discover'}
      </Button>

      {error && <div className="text-xs text-destructive">{error}</div>}

      {profiles.length > 0 && (
        <div className="space-y-1 border-t border-border pt-2">
          <div className="px-1 text-[10px] uppercase tracking-wide text-muted-foreground">Saved</div>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Radar className="size-5 text-primary" /> Discovered MiSTers
            </DialogTitle>
            <DialogDescription>Pick a device to connect over its mrext Remote API.</DialogDescription>
          </DialogHeader>

          {busy ? (
            <div className="flex flex-col items-center gap-3 py-10 text-sm text-muted-foreground">
              <Loader2 className="size-7 animate-spin text-primary" />
              Scanning your network…
            </div>
          ) : found.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center text-sm text-muted-foreground">
              <SearchX className="size-7" />
              No MiSTer found. Make sure it's powered on and the mrext Remote service is running,
              then scan again.
              <Button onClick={discover} size="sm" variant="secondary">
                <Radar /> Scan again
              </Button>
            </div>
          ) : (
            <ul className="space-y-2">
              {found.map((d) => (
                <li key={d.host}>
                  <button
                    onClick={() => connectDevice(d)}
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
        </DialogContent>
      </Dialog>
    </div>
  )
}
