import { SshTelemetry } from '@shared/types'

// One batched command so a single SSH exec returns everything. Verified on a real
// MiSTer (kernel 5.15.x). Note: the DE10-Nano does not expose a CPU/FPGA temperature
// via sysfs, so `temp` is empty there and temperatureC resolves to null.
export const PROBE_COMMAND =
  'echo uptime=$(cat /proc/uptime); ' +
  'echo loadavg=$(cat /proc/loadavg); ' +
  'echo memtotal=$(awk "/MemTotal/{print \\$2}" /proc/meminfo); ' +
  'echo memfree=$(awk "/MemAvailable/{print \\$2}" /proc/meminfo); ' +
  'echo kernel=$(uname -r); ' +
  'echo temp=$(cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null)'

function num(v: string | undefined): number | null {
  if (v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function parseSshProbe(raw: string): SshTelemetry {
  const map: Record<string, string> = {}
  for (const line of raw.split('\n')) {
    const eq = line.indexOf('=')
    if (eq === -1) continue
    map[line.slice(0, eq).trim()] = line.slice(eq + 1).trim()
  }
  const uptime = num(map.uptime?.split(/\s+/)[0])
  const load = num(map.loadavg?.split(/\s+/)[0])
  const tempRaw = num(map.temp)
  return {
    uptimeSeconds: uptime === null ? null : Math.floor(uptime),
    loadAvg: load,
    memTotalKb: num(map.memtotal),
    memFreeKb: num(map.memfree),
    temperatureC: tempRaw === null ? null : tempRaw / 1000,
    kernel: map.kernel && map.kernel.length > 0 ? map.kernel : null,
    raw: map
  }
}
