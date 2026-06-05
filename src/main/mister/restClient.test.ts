import { describe, it, expect, afterEach } from 'vitest'
import { startHttpMock } from '../../../tests/helpers/httpMock'
import { RestClient } from './restClient'

let close: (() => Promise<void>) | null = null
afterEach(async () => { if (close) await close(); close = null })

describe('RestClient', () => {
  it('maps mrext status payload into MisterStatus camelCase', async () => {
    const mock = await startHttpMock([
      { method: 'GET', path: '/api/status', body: {
        core: 'SNES', system: 'SNES', game: 'Chrono Trigger',
        hostname: 'MiSTer', version: 'mrext-1.0', ip: '192.168.31.50',
        ips: ['192.168.31.50'], dns: '192.168.31.1',
        disk_total: 32_000_000_000, disk_used: 24_000_000_000, disk_free: 8_000_000_000
      } }
    ])
    close = mock.close
    const client = new RestClient('127.0.0.1', mock.port)
    const status = await client.getStatus()
    expect(status.online).toBe(true)
    expect(status.core).toBe('SNES')
    expect(status.game).toBe('Chrono Trigger')
    expect(status.diskTotal).toBe(32_000_000_000)
    expect(status.diskFree).toBe(8_000_000_000)
  })

  it('returns offline status when the host is unreachable', async () => {
    const client = new RestClient('127.0.0.1', 1) // nothing listening
    const status = await client.getStatus()
    expect(status.online).toBe(false)
    expect(status.core).toBeNull()
  })

  it('POSTs the launch path', async () => {
    const mock = await startHttpMock([
      { method: 'POST', path: '/api/games/launch', body: { ok: true } }
    ])
    close = mock.close
    const client = new RestClient('127.0.0.1', mock.port)
    await client.launchGame('/media/fat/games/SNES/Chrono Trigger.sfc')
    expect(mock.calls[0].method).toBe('POST')
    expect(mock.calls[0].url).toBe('/api/games/launch')
    expect(JSON.parse(mock.calls[0].body)).toEqual({
      path: '/media/fat/games/SNES/Chrono Trigger.sfc'
    })
  })

  it('POSTs to the reboot endpoint', async () => {
    const mock = await startHttpMock([
      { method: 'POST', path: '/api/system/reboot', body: { ok: true } }
    ])
    close = mock.close
    const client = new RestClient('127.0.0.1', mock.port)
    await client.reboot()
    expect(mock.calls[0].method).toBe('POST')
    expect(mock.calls[0].url).toBe('/api/system/reboot')
  })
})
