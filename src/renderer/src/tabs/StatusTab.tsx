import { Cpu, Gamepad2, Server, Network, HardDrive } from 'lucide-react'
import { useStatusContext } from '../hooks/status-context'
import { StatCard } from '../components/StatCard'
import { StatusDot } from '../components/StatusDot'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Progress } from '../components/ui/progress'
import { Badge } from '../components/ui/badge'
import { gb, diskPercent } from '../lib/format'

export function StatusTab(): JSX.Element {
  const s = useStatusContext()
  const pct = diskPercent(s.diskUsed, s.diskTotal)
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Status</h1>
          <p className="text-sm text-muted-foreground">Live view of your MiSTer</p>
        </div>
        <Badge variant={s.online ? 'pink' : 'muted'} className="gap-2">
          <StatusDot online={s.online} />
          {s.online ? 'Online' : 'Offline'}
        </Badge>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="flex flex-wrap items-center gap-x-10 gap-y-3 p-6">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Core</div>
            <div className="font-mono text-3xl font-bold text-primary">{s.core ?? '—'}</div>
          </div>
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Now playing</div>
            <div className="truncate text-xl font-semibold">{s.game ?? '—'}</div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Server} label="System" value={s.system ?? '—'} />
        <StatCard icon={Cpu} label="Version" value={s.version ?? '—'} accent="pink" />
        <StatCard icon={Network} label="IP" value={s.ip ?? '—'} />
        <StatCard icon={Gamepad2} label="Hostname" value={s.hostname ?? '—'} accent="pink" />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <HardDrive className="size-4 text-primary" /> Disk
          </CardTitle>
          <span className="font-mono text-sm text-muted-foreground">
            {gb(s.diskUsed)} / {gb(s.diskTotal)}
          </span>
        </CardHeader>
        <CardContent>
          <Progress value={pct} indicatorClassName={pct > 90 ? 'bg-destructive' : 'bg-primary'} />
          <div className="mt-2 text-right text-xs text-muted-foreground">{pct}% used</div>
        </CardContent>
      </Card>
    </div>
  )
}
