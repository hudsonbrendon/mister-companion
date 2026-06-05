export function gb(bytes: number | null): string {
  return bytes === null ? '—' : `${(bytes / 1e9).toFixed(1)} GB`
}

export function diskPercent(used: number | null, total: number | null): number {
  if (!used || !total || total <= 0) return 0
  return Math.min(100, Math.round((used / total) * 100))
}

export function formatUptime(seconds: number | null): string {
  if (seconds === null) return '—'
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export function mb(kb: number | null): string {
  return kb === null ? '—' : `${Math.round(kb / 1024)} MB`
}

// Memory USED percentage from available/total (in KB).
export function memPercent(availKb: number | null, totalKb: number | null): number {
  if (!availKb || !totalKb || totalKb <= 0) return 0
  return Math.min(100, Math.round(((totalKb - availKb) / totalKb) * 100))
}
