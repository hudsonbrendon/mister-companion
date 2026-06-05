import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Radar, Plug, Loader2 } from 'lucide-react'
import { api } from './api'
import { DiscoveredDevice, MisterProfile } from '@shared/types'
import { Button } from './components/ui/button'
import { cn } from './lib/utils'

export function ConnectionBar({ localIp }: { localIp: string }): JSX.Element {
  const [found, setFound] = useState<DiscoveredDevice[]>([])
  const [profiles, setProfiles] = useState<MisterProfile[]>([])
  const [busy, setBusy] = useState(false)
  const [connected, setConnected] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.listProfiles().then(setProfiles).catch(() => {})
  }, [])

  const discover = async () => {
    setBusy(true)
    try {
      setFound(await api.discover(localIp))
    } finally {
      setBusy(false)
    }
  }

  const connectProfile = async (profile: MisterProfile) => {
    try {
      await api.connect(profile)
      setConnected(profile.host)
      setError(null)
      toast.success(`Connected to ${profile.name}`, { description: profile.host })
    } catch (e) {
      const msg = `Connect failed: ${String(e)}`
      setError(msg)
      toast.error(msg)
    }
  }

  const connectDevice = (d: DiscoveredDevice) =>
    connectProfile({ id: d.host, name: d.hostname ?? d.host, host: d.host, restPort: 8182, sshPort: 22 })

  return (
    <div className="space-y-2 rounded-lg border border-border bg-background/40 p-3">
      <Button onClick={discover} disabled={busy} size="sm" variant="secondary" className="w-full">
        {busy ? <Loader2 className="animate-spin" /> : <Radar />}
        {busy ? 'Scanning…' : 'Discover'}
      </Button>

      {connected && (
        <div className="flex items-center gap-1.5 text-xs text-pink">
          <Plug className="size-3" /> {connected}
        </div>
      )}
      {error && <div className="text-xs text-destructive">{error}</div>}

      {found.length > 0 && (
        <ul className="space-y-1">
          {found.map((d) => (
            <li key={d.host}>
              <button
                onClick={() => connectDevice(d)}
                className="w-full truncate rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent"
              >
                {d.hostname ?? d.host} — {d.host}
              </button>
            </li>
          ))}
        </ul>
      )}

      {profiles.length > 0 && (
        <div className="space-y-1 border-t border-border pt-2">
          <div className="px-1 text-[10px] uppercase tracking-wide text-muted-foreground">Saved</div>
          {profiles.map((p) => (
            <button
              key={p.id}
              onClick={() => connectProfile(p)}
              className={cn('w-full truncate rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent')}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
