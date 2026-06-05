import WebSocket from 'ws'

export const WS_PATH = '/api/ws' // VERIFY against real device (plan checkpoint)

interface WsClientOpts {
  reconnectDelayMs?: number
  path?: string
}

export class WsClient {
  private ws: WebSocket | null = null
  private stopped = false
  private reconnectDelayMs: number
  private path: string

  constructor(private host: string, private port = 8182, opts: WsClientOpts = {}) {
    this.reconnectDelayMs = opts.reconnectDelayMs ?? 5000
    this.path = opts.path ?? WS_PATH
  }

  listen(onMessage: (raw: string) => void): void {
    this.stopped = false
    const connect = () => {
      if (this.stopped) return
      this.ws = new WebSocket(`ws://${this.host}:${this.port}${this.path}`)
      this.ws.on('message', (data) => onMessage(data.toString()))
      this.ws.on('close', () => {
        if (!this.stopped) setTimeout(connect, this.reconnectDelayMs)
      })
      this.ws.on('error', () => this.ws?.close())
    }
    connect()
  }

  stop(): void {
    this.stopped = true
    this.ws?.close()
    this.ws = null
  }
}
