import { describe, it, expect, afterEach } from 'vitest'
import { startHttpMock } from '../../../tests/helpers/httpMock'
import { RestClient } from './restClient'

let close: (() => Promise<void>) | null = null
afterEach(async () => { if (close) await close(); close = null })

describe('RestClient', () => {
  it('merges /api/sysinfo + /api/games/playing into MisterStatus', async () => {
    const mock = await startHttpMock([
      { method: 'GET', path: '/api/sysinfo', body: {
        hostname: 'MiSTer', version: '0.4', ips: ['192.168.31.113'], dns: 'MiSTer.local',
        disks: [{ path: '/media/fat', total: 127857197056, used: 120988237824, free: 6868959232, displayName: 'SD card' }]
      } },
      { method: 'GET', path: '/api/games/playing', body: {
        core: 'GAMEBOY', system: 'GameboyColor', systemName: 'Gameboy Color', game: 'zelda', gameName: 'Zelda'
      } }
    ])
    close = mock.close
    const client = new RestClient('127.0.0.1', mock.port)
    const status = await client.getStatus()
    expect(status.online).toBe(true)
    expect(status.core).toBe('GAMEBOY')
    expect(status.system).toBe('Gameboy Color') // prefers systemName
    expect(status.game).toBe('Zelda') // prefers gameName
    expect(status.hostname).toBe('MiSTer')
    expect(status.version).toBe('0.4')
    expect(status.ip).toBe('192.168.31.113') // derived from ips[0]
    expect(status.ips).toEqual(['192.168.31.113'])
    expect(status.diskTotal).toBe(127857197056)
    expect(status.diskUsed).toBe(120988237824)
    expect(status.diskFree).toBe(6868959232)
  })

  it('maps empty core/game strings to null (core menu, no game)', async () => {
    const mock = await startHttpMock([
      { method: 'GET', path: '/api/sysinfo', body: { hostname: 'MiSTer', ips: ['10.0.0.5'] } },
      { method: 'GET', path: '/api/games/playing', body: { core: 'GAMEBOY', system: '', systemName: '', game: '', gameName: '' } }
    ])
    close = mock.close
    const client = new RestClient('127.0.0.1', mock.port)
    const status = await client.getStatus()
    expect(status.core).toBe('GAMEBOY')
    expect(status.system).toBeNull()
    expect(status.game).toBeNull()
  })

  it('is still online when games/playing is unavailable (sysinfo is the source of truth)', async () => {
    const mock = await startHttpMock([
      { method: 'GET', path: '/api/sysinfo', body: { hostname: 'MiSTer', ips: ['10.0.0.5'] } }
      // no /api/games/playing route -> 404 -> json() returns null
    ])
    close = mock.close
    const client = new RestClient('127.0.0.1', mock.port)
    const status = await client.getStatus()
    expect(status.online).toBe(true)
    expect(status.hostname).toBe('MiSTer')
    expect(status.core).toBeNull()
  })

  it('returns offline status when the host is unreachable', async () => {
    const client = new RestClient('127.0.0.1', 1) // nothing listening
    const status = await client.getStatus()
    expect(status.online).toBe(false)
    expect(status.core).toBeNull()
  })

  it('POSTs {path} to the launch endpoint', async () => {
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
      { method: 'POST', path: '/api/settings/system/reboot', body: { ok: true } }
    ])
    close = mock.close
    const client = new RestClient('127.0.0.1', mock.port)
    await client.reboot()
    expect(mock.calls[0].method).toBe('POST')
    expect(mock.calls[0].url).toBe('/api/settings/system/reboot')
  })

  it('searchGames normalizes body.data (array) shape', async () => {
    const mock = await startHttpMock([
      {
        method: 'POST',
        path: '/api/games/search',
        body: { data: [{ name: 'Zelda', path: '/x', system: { id: 'SNES', name: 'SNES' } }] }
      }
    ])
    close = mock.close
    const client = new RestClient('127.0.0.1', mock.port)
    const results = await client.searchGames('Zelda')
    expect(results).toEqual([{ name: 'Zelda', path: '/x', systemId: 'SNES', systemName: 'SNES' }])
  })

  it('searchGames normalizes body.data.items shape', async () => {
    const mock = await startHttpMock([
      {
        method: 'POST',
        path: '/api/games/search',
        body: { data: { items: [{ name: 'Zelda', path: '/x', system: { id: 'SNES', name: 'SNES' } }] } }
      }
    ])
    close = mock.close
    const client = new RestClient('127.0.0.1', mock.port)
    const results = await client.searchGames('Zelda')
    expect(results).toEqual([{ name: 'Zelda', path: '/x', systemId: 'SNES', systemName: 'SNES' }])
  })

  it('sendKey POSTs to the control endpoint', async () => {
    const mock = await startHttpMock([
      { method: 'POST', path: '/api/controls/keyboard/up', body: { ok: true } }
    ])
    close = mock.close
    const client = new RestClient('127.0.0.1', mock.port)
    await client.sendKey('up')
    expect(mock.calls[0].method).toBe('POST')
    expect(mock.calls[0].url).toBe('/api/controls/keyboard/up')
  })

  it('getWallpapers filters macOS junk and builds absolute image URLs', async () => {
    const mock = await startHttpMock([
      { method: 'GET', path: '/api/wallpapers', body: {
        active: 'a.png', backgroundMode: 2,
        wallpapers: [
          { name: 'A', filename: 'a.png', active: true },
          { name: 'junk', filename: '._a.png', active: false }
        ]
      } }
    ])
    close = mock.close
    const client = new RestClient('127.0.0.1', mock.port)
    const data = await client.getWallpapers()
    expect(data.active).toBe('a.png')
    expect(data.wallpapers).toHaveLength(1)
    expect(data.wallpapers[0].filename).toBe('a.png')
    expect(data.wallpapers[0].imageUrl).toBe(`http://127.0.0.1:${mock.port}/api/wallpapers/a.png`)
  })
})
