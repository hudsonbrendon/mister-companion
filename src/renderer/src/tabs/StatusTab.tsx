import { Cpu, Gamepad2, Server, Network, HardDrive, Activity, Clock, MemoryStick, SquareTerminal } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStatusContext } from '../hooks/status-context'
import { useTelemetry } from '../hooks/useTelemetry'
import { StatCard } from '../components/StatCard'
import { StatusDot } from '../components/StatusDot'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Progress } from '../components/ui/progress'
import { Badge } from '../components/ui/badge'
import { gb, diskPercent, formatUptime, mb, memPercent } from '../lib/format'

export function StatusTab(): JSX.Element {
  const s = useStatusContext()
  const tel = useTelemetry(s.online)
  const { t } = useTranslation()
  const pct = diskPercent(s.diskUsed, s.diskTotal)
  const memPct = memPercent(tel?.memFreeKb ?? null, tel?.memTotalKb ?? null)
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('nav.status')}</h1>
          <p className="text-sm text-muted-foreground">{t('status.subtitle')}</p>
        </div>
        <Badge variant={s.online ? 'pink' : 'muted'} className="gap-2">
          <StatusDot online={s.online} />
          {s.online ? t('common.online') : t('common.offline')}
        </Badge>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="flex flex-wrap items-center gap-x-10 gap-y-3 p-6">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{t('status.core')}</div>
            <div className="font-mono text-3xl font-bold text-primary">{s.core ?? '—'}</div>
          </div>
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{t('status.nowPlaying')}</div>
            <div className="truncate text-xl font-semibold">{s.game ?? '—'}</div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Server} label={t('status.system')} value={s.system ?? '—'} />
        <StatCard icon={Cpu} label={t('status.version')} value={s.version ?? '—'} accent="pink" />
        <StatCard icon={Network} label={t('status.ip')} value={s.ip ?? '—'} />
        <StatCard icon={Gamepad2} label={t('status.hostname')} value={s.hostname ?? '—'} accent="pink" />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <HardDrive className="size-4 text-primary" /> {t('status.disk')}
          </CardTitle>
          <span className="font-mono text-sm text-muted-foreground">
            {gb(s.diskUsed)} / {gb(s.diskTotal)}
          </span>
        </CardHeader>
        <CardContent>
          <Progress value={pct} indicatorClassName={pct > 90 ? 'bg-destructive' : 'bg-primary'} />
          <div className="mt-2 text-right text-xs text-muted-foreground">{t('status.used', { pct })}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="size-4 text-primary" /> {t('status.systemHealth')}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-8 gap-y-4 lg:grid-cols-4">
          <div className="flex items-center gap-3">
            <Clock className="size-5 text-muted-foreground" />
            <div>
              <div className="text-xs uppercase text-muted-foreground">{t('status.uptime')}</div>
              <div className="font-mono font-semibold">{formatUptime(tel?.uptimeSeconds ?? null)}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Activity className="size-5 text-muted-foreground" />
            <div>
              <div className="text-xs uppercase text-muted-foreground">{t('status.load')}</div>
              <div className="font-mono font-semibold">{tel?.loadAvg != null ? tel.loadAvg.toFixed(2) : '—'}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <SquareTerminal className="size-5 text-muted-foreground" />
            <div className="min-w-0">
              <div className="text-xs uppercase text-muted-foreground">{t('status.kernel')}</div>
              <div className="truncate font-mono font-semibold">{tel?.kernel ?? '—'}</div>
            </div>
          </div>
          <div className="col-span-2 flex items-center gap-3 lg:col-span-1">
            <MemoryStick className="size-5 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between text-xs uppercase text-muted-foreground">
                <span>{t('status.memory')}</span>
                <span className="font-mono normal-case">{mb(tel ? (tel.memTotalKb ?? 0) - (tel.memFreeKb ?? 0) : null)}</span>
              </div>
              <Progress value={memPct} className="mt-1.5 h-2" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
