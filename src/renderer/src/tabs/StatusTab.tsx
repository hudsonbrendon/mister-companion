import { useStatus } from '../hooks/useStatus'

function gb(bytes: number | null): string {
  return bytes === null ? '—' : `${(bytes / 1e9).toFixed(1)} GB`
}

export function StatusTab(): JSX.Element {
  const s = useStatus()
  return (
    <div className="status">
      <div className="status-indicator">{s.online ? 'Online' : 'Offline'}</div>
      <dl>
        <dt>Core</dt><dd>{s.core ?? '—'}</dd>
        <dt>System</dt><dd>{s.system ?? '—'}</dd>
        <dt>Game</dt><dd>{s.game ?? '—'}</dd>
        <dt>Hostname</dt><dd>{s.hostname ?? '—'}</dd>
        <dt>Version</dt><dd>{s.version ?? '—'}</dd>
        <dt>IP</dt><dd>{s.ip ?? '—'}</dd>
        <dt>Disk</dt><dd>{gb(s.diskUsed)} / {gb(s.diskTotal)}</dd>
      </dl>
    </div>
  )
}
