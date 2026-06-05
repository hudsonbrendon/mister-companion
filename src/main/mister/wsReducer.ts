import { MisterStatus } from '@shared/types'

// Pure reducer: given a raw WS message string and the current status, return the next
// status. Mirrors python-mister-fpga's apply_ws_message intent (core/game transitions).
// VERIFY message shapes against a real device (see plan checkpoint).
export function applyWsMessage(message: string, status: MisterStatus): MisterStatus {
  let parsed: { type?: string; core?: string; system?: string; game?: string }
  try {
    parsed = JSON.parse(message)
  } catch {
    return status
  }
  switch (parsed.type) {
    case 'status':
      return {
        ...status,
        core: parsed.core ?? status.core,
        system: parsed.system ?? status.system,
        game: parsed.game ?? status.game
      }
    case 'menu':
      return { ...status, core: 'menu', game: null }
    default:
      return status
  }
}
