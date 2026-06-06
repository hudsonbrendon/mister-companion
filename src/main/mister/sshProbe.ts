import { SshTelemetry } from '@shared/types'

// One batched command so a single SSH exec returns everything. Verified on a real
// MiSTer (kernel 5.15.x). Note: the DE10-Nano does not expose a CPU/FPGA temperature
// via sysfs, so `temp` is empty there and temperatureC resolves to null.
export const PROBE_COMMAND =
  'echo uptime=$(cat /proc/uptime); ' +
  'echo loadavg=$(cat /proc/loadavg); ' +
  'echo memtotal=$(awk "/MemTotal/{print \\$2}" /proc/meminfo); ' +
  'echo memfree=$(awk "/MemAvailable/{print \\$2}" /proc/meminfo); ' +
  'echo swaptotal=$(awk "/SwapTotal/{print \\$2}" /proc/meminfo); ' +
  'echo swapfree=$(awk "/SwapFree/{print \\$2}" /proc/meminfo); ' +
  'echo nproc=$(nproc 2>/dev/null); ' +
  'echo cpumodel=$(awk -F": " "/Hardware/{print \\$2; exit}" /proc/cpuinfo 2>/dev/null); ' +
  'echo cpufreq=$(cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq 2>/dev/null); ' +
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
  const loadParts = map.loadavg?.split(/\s+/) ?? []
  const uptime = num(map.uptime?.split(/\s+/)[0])
  const tempRaw = num(map.temp)
  // loadavg field 4 is "running/total" tasks — total is the process/thread count.
  const procCount = num(loadParts[3]?.split('/')[1])
  const freqKhz = num(map.cpufreq)
  return {
    uptimeSeconds: uptime === null ? null : Math.floor(uptime),
    loadAvg: num(loadParts[0]),
    load5: num(loadParts[1]),
    load15: num(loadParts[2]),
    memTotalKb: num(map.memtotal),
    memFreeKb: num(map.memfree),
    swapTotalKb: num(map.swaptotal),
    swapFreeKb: num(map.swapfree),
    temperatureC: tempRaw === null ? null : tempRaw / 1000,
    cpuCount: num(map.nproc),
    cpuModel: map.cpumodel && map.cpumodel.length > 0 ? map.cpumodel : null,
    cpuMhz: freqKhz === null ? null : Math.round(freqKhz / 1000),
    procCount,
    kernel: map.kernel && map.kernel.length > 0 ? map.kernel : null,
    raw: map
  }
}
