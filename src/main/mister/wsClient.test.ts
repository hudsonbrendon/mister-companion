import { describe, it, expect, afterEach } from 'vitest'
import { startWsMock } from '../../../tests/helpers/wsMock'
import { WsClient } from './wsClient'

let close: (() => Promise<void>) | null = null
afterEach(async () => { if (close) await close(); close = null })

describe('WsClient', () => {
  it('invokes the callback for each received message', async () => {
    const mock = await startWsMock()
    close = mock.close
    const received: string[] = []
    const client = new WsClient('127.0.0.1', mock.port, { path: '' })
    client.listen((m) => received.push(m))
    await new Promise((r) => setTimeout(r, 100)) // allow connect
    mock.broadcast('hello')
    await new Promise((r) => setTimeout(r, 100))
    client.stop()
    expect(received).toContain('hello')
  })
})
