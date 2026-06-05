import { MisterStatus, emptyStatus } from '@shared/types'

// mrext Remote REST API paths — verified against a real MiSTer (mrext Remote v0.4).
// System info and the currently-running core/game live on two separate endpoints.
export const REST_PATHS = {
  sysinfo: '/api/sysinfo',
  playing: '/api/games/playing',
  launch: '/api/games/launch',
  reboot: '/api/settings/system/reboot'
} as const

interface RawDisk {
  path: string
  total?: number
  used?: number
  free?: number
  displayName?: string
}

interface RawSysinfo {
  hostname?: string
  version?: string
  ip?: string
  ips?: string[]
  dns?: string
  disks?: RawDisk[]
}

interface RawPlaying {
  core?: string
  system?: string
  systemName?: string
  game?: string
  gameName?: string
}

// mrext returns "" for an absent core/game/etc.; treat empty strings as null.
function nz(value: string | undefined | null): string | null {
  return value && value.length > 0 ? value : null
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

  private async json<T>(path: string): Promise<T | null> {
    try {
      const res = await this.request(path)
      if (!res.ok) return null
      return (await res.json()) as T
    } catch {
      return null
    }
  }

  async getStatus(): Promise<MisterStatus> {
    // sysinfo is the source of truth for "online"; games/playing is best-effort.
    const [sys, play] = await Promise.all([
      this.json<RawSysinfo>(REST_PATHS.sysinfo),
      this.json<RawPlaying>(REST_PATHS.playing)
    ])
    if (!sys) return emptyStatus()

    const disk = (sys.disks ?? []).find((d) => d.path === '/media/fat') ?? sys.disks?.[0]
    return {
      online: true,
      core: nz(play?.core),
      system: nz(play?.systemName) ?? nz(play?.system),
      game: nz(play?.gameName) ?? nz(play?.game),
      hostname: nz(sys.hostname),
      version: nz(sys.version),
      ip: nz(sys.ip) ?? sys.ips?.[0] ?? null,
      ips: sys.ips ?? [],
      dns: nz(sys.dns),
      diskTotal: disk?.total ?? null,
      diskUsed: disk?.used ?? null,
      diskFree: disk?.free ?? null
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
