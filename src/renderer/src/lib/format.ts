export function gb(bytes: number | null): string {
  return bytes === null ? '—' : `${(bytes / 1e9).toFixed(1)} GB`
}

export function diskPercent(used: number | null, total: number | null): number {
  if (!used || !total || total <= 0) return 0
  return Math.min(100, Math.round((used / total) * 100))
}
