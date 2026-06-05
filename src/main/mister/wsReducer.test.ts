import { describe, it, expect } from 'vitest'
import { emptyStatus } from '@shared/types'
import { applyWsMessage } from './wsReducer'

describe('applyWsMessage', () => {
  it('updates core/system/game from a JSON status message', () => {
    const next = applyWsMessage(
      JSON.stringify({ type: 'status', core: 'Genesis', system: 'Genesis', game: 'Sonic' }),
      { ...emptyStatus(), online: true }
    )
    expect(next.core).toBe('Genesis')
    expect(next.game).toBe('Sonic')
    expect(next.online).toBe(true)
  })

  it('clears game when a menu/core-stop message arrives', () => {
    const start = { ...emptyStatus(), online: true, core: 'SNES', game: 'Zelda' }
    const next = applyWsMessage(JSON.stringify({ type: 'menu' }), start)
    expect(next.game).toBeNull()
    expect(next.core).toBe('menu')
  })

  it('ignores unparseable/unknown messages without throwing', () => {
    const start = { ...emptyStatus(), online: true, core: 'SNES' }
    expect(applyWsMessage('not-json', start)).toEqual(start)
    expect(applyWsMessage(JSON.stringify({ type: 'pong' }), start)).toEqual(start)
  })
})
