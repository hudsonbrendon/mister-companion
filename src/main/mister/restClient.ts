import { MisterStatus, emptyStatus } from '@shared/types'

// mrext Remote REST API paths. VERIFY against python-mister-fpga + a real device
// (see plan "Protocol-fidelity checkpoints"). Centralized so a path change is one edit.
export const REST_PATHS = {
  status: '/api/status',
  launch: '/api/games/launch',
  reboot: '/api/system/reboot'
} as const

interface RawStatus {
  core?: string; system?: string; game?: string; hostname?: string; version?: string
  ip?: string; ips?: string[]; dns?: string
  disk_total?: number; disk_used?: number; disk_free?: number
}

export class RestClient {
  constructor(
    private host: string,
    private port = 8182,
    private timeoutMs = 5000,
    private fetchFn: typeof fetch = fetch
  ) {}

  private url(path: string): string {
    return `http://${this.host}:${this.port}${path}`
  }

  private async request(path: string, init?: RequestInit): Promise<Response> {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), this.timeoutMs)
    try {
      return await this.fetchFn(this.url(path), { ...init, signal: ctrl.signal })
    } finally {
      clearTimeout(timer)
    }
  }

  async getStatus(): Promise<MisterStatus> {
    try {
      const res = await this.request(REST_PATHS.status)
      if (!res.ok) return emptyStatus()
      const raw = (await res.json()) as RawStatus
      return {
        online: true,
        core: raw.core ?? null,
        system: raw.system ?? null,
        game: raw.game ?? null,
        hostname: raw.hostname ?? null,
        version: raw.version ?? null,
        ip: raw.ip ?? null,
        ips: raw.ips ?? [],
        dns: raw.dns ?? null,
        diskTotal: raw.disk_total ?? null,
        diskUsed: raw.disk_used ?? null,
        diskFree: raw.disk_free ?? null
      }
    } catch {
      return emptyStatus()
    }
  }

  // Mutation methods intentionally let network errors propagate so the IPC layer
  // can surface failures to the renderer (unlike getStatus, which degrades to offline).
  async launchGame(path: string): Promise<void> {
    await this.request(REST_PATHS.launch, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path })
    })
  }

  async reboot(): Promise<void> {
    await this.request(REST_PATHS.reboot, { method: 'POST' })
  }
}
