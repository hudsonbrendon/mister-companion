import { WebSocketServer } from 'ws'

export async function startWsMock() {
  const wss = new WebSocketServer({ host: '127.0.0.1', port: 0 })
  await new Promise<void>((r) => wss.on('listening', r))
  const port = (wss.address() as import('node:net').AddressInfo).port
  return {
    port,
    broadcast: (msg: string) => wss.clients.forEach((c) => c.send(msg)),
    close: () => new Promise<void>((r) => wss.close(() => r()))
  }
}
