import {
  Cpu, Gamepad2, Server, Network, HardDrive, Activity, Clock, MemoryStick,
  SquareTerminal, Thermometer, Globe, Database, ListTree
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStatusContext } from '../hooks/status-context'
import { useTelemetry } from '../hooks/useTelemetry'
import { StatCard } from '../components/StatCard'
import { StatusDot } from '../components/StatusDot'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Progress } from '../components/ui/progress'
import { Badge } from '../components/ui/badge'
import { gb, diskPercent, formatUptime, mb, memPercent, formatLoad } from '../lib/format'

export function StatusTab(): JSX.Element {
  const s = useStatusContext()
  const tel = useTelemetry(s.online)
  const { t } = useTranslation()
  const pct = diskPercent(s.diskUsed, s.diskTotal)
  const memPct = memPercent(tel?.memFreeKb ?? null, tel?.memTotalKb ?? null)
  const swapPct =
    tel?.swapTotalKb && tel.swapTotalKb > 0
      ? Math.min(100, Math.round(((tel.swapTotalKb - (tel.swapFreeKb ?? 0)) / tel.swapTotalKb) * 100))
      : 0
  const tempC = tel?.temperatureC ?? null
  const cpuValue = [
    tel?.cpuModel,
    tel?.cpuCount != null ? t('status.cores', { n: tel.cpuCount }) : null,
    tel?.cpuMhz != null ? `${tel.cpuMhz} MHz` : null
  ]
    .filter(Boolean)
    .join(' · ')
  const extraIps = s.ips.filter((ip) => ip !== s.ip)

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
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{t('status.system')}</div>
            <div className="truncate text-xl font-semibold">{s.system ?? '—'}</div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Gamepad2} label={t('status.hostname')} value={s.hostname ?? '—'} accent="pink" />
        <StatCard icon={Network} label={t('status.ip')} value={s.ip ?? '—'} />
        <StatCard icon={Globe} label={t('status.dns')} value={s.dns ?? '—'} />
        <StatCard icon={Cpu} label={t('status.version')} value={s.version ?? '—'} accent="pink" />
      </div>

      {extraIps.length > 0 && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-x-2 gap-y-1 p-4 text-sm">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">{t('status.ipAddresses')}</span>
            {[s.ip, ...extraIps].filter(Boolean).map((ip) => (
              <Badge key={ip} variant="muted" className="font-mono">{ip}</Badge>
            ))}
          </CardContent>
        </Card>
      )}

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
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>{t('status.free')}: {gb(s.diskFree)}</span>
            <span>{t('status.used', { pct })}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MemoryStick className="size-4 text-primary" /> {t('status.memory')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{t('status.memory')}</span>
              <span className="font-mono">
                {mb(tel ? (tel.memTotalKb ?? 0) - (tel.memFreeKb ?? 0) : null)} / {mb(tel?.memTotalKb ?? null)}
              </span>
            </div>
            <Progress value={memPct} className="mt-1.5 h-2" />
          </div>
          {tel?.swapTotalKb != null && tel.swapTotalKb > 0 && (
            <div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{t('status.swap')}</span>
                <span className="font-mono">
                  {mb((tel.swapTotalKb ?? 0) - (tel.swapFreeKb ?? 0))} / {mb(tel.swapTotalKb)}
                </span>
              </div>
              <Progress value={swapPct} className="mt-1.5 h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="size-4 text-primary" /> {t('status.systemHealth')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!s.online ? (
            <p className="text-sm text-muted-foreground">{t('status.noSsh')}</p>
          ) : (
            <div className="grid grid-cols-2 gap-x-8 gap-y-5 lg:grid-cols-3">
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
                  <div className="font-mono font-semibold">
                    {formatLoad(tel?.loadAvg ?? null)} · {formatLoad(tel?.load5 ?? null)} · {formatLoad(tel?.load15 ?? null)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">{t('status.loadHint')}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Thermometer
                  className={`size-5 ${tempC != null && tempC >= 75 ? 'text-destructive' : 'text-muted-foreground'}`}
                />
                <div>
                  <div className="text-xs uppercase text-muted-foreground">{t('status.temperature')}</div>
                  <div className="font-mono font-semibold">{tempC != null ? `${tempC.toFixed(1)} °C` : '—'}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 lg:col-span-2">
                <Cpu className="size-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <div className="text-xs uppercase text-muted-foreground">{t('status.cpu')}</div>
                  <div className="truncate font-mono font-semibold">{cpuValue || '—'}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <ListTree className="size-5 text-muted-foreground" />
                <div>
                  <div className="text-xs uppercase text-muted-foreground">{t('status.processes')}</div>
                  <div className="font-mono font-semibold">{tel?.procCount ?? '—'}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <SquareTerminal className="size-5 text-muted-foreground" />
                <div className="min-w-0">
                  <div className="text-xs uppercase text-muted-foreground">{t('status.kernel')}</div>
                  <div className="truncate font-mono font-semibold">{tel?.kernel ?? '—'}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Server className="size-5 text-muted-foreground" />
                <div className="min-w-0">
                  <div className="text-xs uppercase text-muted-foreground">{t('status.system')}</div>
                  <div className="truncate font-mono font-semibold">{s.system ?? '—'}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Database className="size-5 text-muted-foreground" />
                <div className="min-w-0">
                  <div className="text-xs uppercase text-muted-foreground">{t('status.swap')}</div>
                  <div className="font-mono font-semibold">{mb(tel?.swapTotalKb ?? null)}</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
