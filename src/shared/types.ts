export interface MisterStatus {
  online: boolean
  core: string | null
  system: string | null
  game: string | null
  hostname: string | null
  version: string | null
  ip: string | null
  ips: string[]
  dns: string | null
  diskTotal: number | null
  diskUsed: number | null
  diskFree: number | null
}

export function emptyStatus(): MisterStatus {
  return {
    online: false, core: null, system: null, game: null, hostname: null,
    version: null, ip: null, ips: [], dns: null,
    diskTotal: null, diskUsed: null, diskFree: null
  }
}

export interface MisterProfile {
  id: string
  name: string
  host: string
  restPort: number
  sshPort: number
  sshUser?: string
  sshPassword?: string
}

export interface SshTelemetry {
  uptimeSeconds: number | null
  loadAvg: number | null
  memTotalKb: number | null
  memFreeKb: number | null
  temperatureC: number | null
  kernel: string | null
  raw: Record<string, string>
}

export interface DiscoveredDevice {
  host: string
  hostname: string | null
  source: 'scan' | 'mdns'
}

export interface ScriptDef {
  id: string
  label: string
  description: string
  command: string
}

export interface RaSummary {
  hardcorePoints: number
  softcorePoints: number
  rank: number
  totalRanked: number
  currentGame: RaGameProgress | null
  recentGames: RaGameProgress[]
}

export interface RaGameProgress {
  gameId: number
  title: string
  console: string
  numAchieved: number
  numPossible: number
  percent: number
  iconUrl: string | null
}

export interface SmbEntry {
  name: string
  isDirectory: boolean
  size: number
}

export interface GameResult {
  name: string
  path: string
  systemId: string
  systemName: string
}

export interface GameSystem {
  id: string
  name: string
  category?: string
}

export interface IndexStatus {
  exists: boolean
  indexing: boolean
  current: number
  total: number
  desc: string
}

export const IPC = {
  // request/response (invoke/handle)
  listProfiles: 'profiles:list',
  saveProfile: 'profiles:save',
  deleteProfile: 'profiles:delete',
  connect: 'mister:connect',
  disconnect: 'mister:disconnect',
  getStatus: 'mister:getStatus',
  launchGame: 'mister:launchGame',
  reboot: 'mister:reboot',
  discover: 'mister:discover',
  sshProbe: 'mister:sshProbe',
  listScripts: 'mister:listScripts',
  runScript: 'mister:runScript',
  raSummary: 'mister:raSummary',
  smbList: 'mister:smbList',
  searchGames: 'mister:searchGames',
  searchSystems: 'mister:searchSystems',
  generateIndex: 'mister:generateIndex',
  // main → renderer events (send/on)
  statusUpdate: 'mister:statusUpdate',
  scriptOutput: 'mister:scriptOutput',
  indexStatus: 'mister:indexStatus'
} as const
