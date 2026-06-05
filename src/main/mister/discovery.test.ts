import { describe, it, expect, afterEach } from 'vitest'
import { startHttpMock } from '../../../tests/helpers/httpMock'
import { scanHosts, mergeDevices, subnetHosts } from './discovery'

let close: (() => Promise<void>) | null = null
afterEach(async () => { if (close) await close(); close = null })

describe('discovery', () => {
  it('scanHosts returns only hosts that answer the status probe', async () => {
    const mock = await startHttpMock([
      { method: 'GET', path: '/api/status', body: { hostname: 'MiSTer' } }
    ])
    close = mock.close
    // One reachable host (mock), one dead host (port 1).
    const found = await scanHosts(
      [`127.0.0.1`],
      mock.port,
      300
    )
    expect(found).toHaveLength(1)
    expect(found[0].host).toBe('127.0.0.1')
    expect(found[0].hostname).toBe('MiSTer')
    expect(found[0].source).toBe('scan')
  })

  it('mergeDevices dedupes by host, preferring an mdns hostname', () => {
    const merged = mergeDevices(
      [{ host: '192.168.31.50', hostname: null, source: 'scan' }],
      [{ host: '192.168.31.50', hostname: 'MiSTer.local', source: 'mdns' }]
    )
    expect(merged).toHaveLength(1)
    expect(merged[0].hostname).toBe('MiSTer.local')
  })

  it('subnetHosts returns 254 hosts for a valid IP', () => {
    expect(subnetHosts('192.168.31.20')).toHaveLength(254)
  })

  it('subnetHosts returns [] for a malformed IP with non-numeric octets', () => {
    expect(subnetHosts('192.168.foo.1')).toEqual([])
  })
})
