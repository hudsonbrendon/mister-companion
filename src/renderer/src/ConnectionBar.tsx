import { useEffect, useState } from 'react'
import { api } from './api'
import { DiscoveredDevice, MisterProfile } from '@shared/types'

export function ConnectionBar({ localIp }: { localIp: string }): JSX.Element {
  const [found, setFound] = useState<DiscoveredDevice[]>([])
  const [busy, setBusy] = useState(false)
  const [connected, setConnected] = useState<string | null>(null)
  const [profiles, setProfiles] = useState<MisterProfile[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.listProfiles().then(setProfiles).catch(() => {})
  }, [])

  const discover = async () => {
    setBusy(true)
    try { setFound(await api.discover(localIp)) } finally { setBusy(false) }
  }

  const connectProfile = async (profile: MisterProfile) => {
    try {
      await api.connect(profile)
      setConnected(profile.host)
      setError(null)
    } catch (e) {
      setError(`Connect failed: ${String(e)}`)
    }
  }

  const connect = (d: DiscoveredDevice) => {
    const profile: MisterProfile = {
      id: d.host,
      name: d.hostname ?? d.host,
      host: d.host,
      restPort: 8182,
      sshPort: 22
    }
    connectProfile(profile)
  }

  return (
    <div className="connection-bar">
      <button onClick={discover} disabled={busy}>{busy ? 'Scanning…' : 'Discover'}</button>
      {connected && <span className="connected">Connected: {connected}</span>}
      {error && <div className="error">{error}</div>}
      {profiles.length > 0 && (
        <ul className="profile-list">
          {profiles.map((p) => (
            <li key={p.id}>
              <button onClick={() => connectProfile(p)}>{p.name}</button>
            </li>
          ))}
        </ul>
      )}
      <ul className="device-list">
        {found.map((d) => (
          <li key={d.host}>
            <button onClick={() => connect(d)}>{d.hostname ?? d.host} — {d.host}</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
