import { MisterStatus } from '@shared/types'

// Pure reducer for mrext Remote's WebSocket (verified against a real device).
// Messages are plain "key:value" text tokens, e.g.:
//   coreRunning:GAMEBOY
//   gameRunning:SNES/Chrono.sfc       (system/file; bare name for arcade; empty when none)
//   indexStatus:n,n,0,0,              (game-index build progress — ignored)
export function applyWsMessage(message: string, status: MisterStatus): MisterStatus {
  const sep = message.indexOf(':')
  if (sep === -1) return status
  const key = message.slice(0, sep)
  const raw = message.slice(sep + 1).trim()
  const value = raw.length > 0 ? raw : null

  switch (key) {
    case 'coreRunning':
      if (value === status.core) return status
      // A new core means the previous system/game no longer apply.
      return { ...status, core: value, system: null, game: null }
    case 'gameRunning': {
      if (value === null) return { ...status, game: null }
      const slash = value.indexOf('/')
      if (slash === -1) return { ...status, game: value }
      const file = value.slice(slash + 1)
      const dot = file.lastIndexOf('.')
      return { ...status, game: dot > 0 ? file.slice(0, dot) : file }
    }
    default:
      return status
  }
}
