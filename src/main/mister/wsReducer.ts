import { MisterStatus } from '@shared/types'

// Pure reducer for mrext Remote's WebSocket (verified against a real device).
// Messages are plain "key:value" text tokens, e.g.:
//   coreRunning:GAMEBOY
//   gameRunning:Chrono Trigger        (empty value when no game is loaded)
//   indexStatus:n,n,0,0,              (game-index build progress — ignored)
export function applyWsMessage(message: string, status: MisterStatus): MisterStatus {
  const sep = message.indexOf(':')
  if (sep === -1) return status
  const key = message.slice(0, sep)
  const raw = message.slice(sep + 1).trim()
  const value = raw.length > 0 ? raw : null

  switch (key) {
    case 'coreRunning':
      return { ...status, core: value }
    case 'gameRunning':
      return { ...status, game: value }
    default:
      return status
  }
}
