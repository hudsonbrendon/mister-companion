import { describe, it, expect } from 'vitest'
import { parseSshProbe, PROBE_COMMAND } from './sshProbe'

describe('parseSshProbe', () => {
  it('parses the batched key=value probe output', () => {
    const raw = [
      'uptime=12345.67 0.00',
      'loadavg=0.42 0.31 0.20 1/123 4567',
      'memtotal=1019234',
      'memfree=812340',
      'kernel=5.15.1-MiSTer',
      'temp=48123'
    ].join('\n')
    const t = parseSshProbe(raw)
    expect(t.uptimeSeconds).toBe(12345)
    expect(t.loadAvg).toBeCloseTo(0.42)
    expect(t.memTotalKb).toBe(1019234)
    expect(t.memFreeKb).toBe(812340)
    expect(t.temperatureC).toBeCloseTo(48.123)
    expect(t.kernel).toBe('5.15.1-MiSTer')
  })

  it('PROBE_COMMAND is a single batched command line', () => {
    expect(PROBE_COMMAND).toContain('uptime')
    expect(PROBE_COMMAND).not.toContain('\n')
  })

  it('tolerates missing fields', () => {
    const t = parseSshProbe('memfree=100')
    expect(t.memFreeKb).toBe(100)
    expect(t.uptimeSeconds).toBeNull()
    expect(t.temperatureC).toBeNull()
    expect(t.kernel).toBeNull()
  })
})
