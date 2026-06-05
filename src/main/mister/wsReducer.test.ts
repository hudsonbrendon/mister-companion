import { describe, it, expect } from 'vitest'
import { emptyStatus } from '@shared/types'
import { applyWsMessage } from './wsReducer'

describe('applyWsMessage', () => {
  it('sets the core from a coreRunning token', () => {
    const next = applyWsMessage('coreRunning:GAMEBOY', { ...emptyStatus(), online: true })
    expect(next.core).toBe('GAMEBOY')
    expect(next.online).toBe(true)
  })

  it('sets the game from a gameRunning token', () => {
    const next = applyWsMessage('gameRunning:Chrono Trigger', { ...emptyStatus(), online: true, core: 'SNES' })
    expect(next.game).toBe('Chrono Trigger')
    expect(next.core).toBe('SNES')
  })

  it('maps an empty gameRunning value to null (no game loaded)', () => {
    const start = { ...emptyStatus(), online: true, core: 'GAMEBOY', game: 'Zelda' }
    const next = applyWsMessage('gameRunning:', start)
    expect(next.game).toBeNull()
  })

  it('ignores indexStatus, colon-less, and unknown tokens without throwing', () => {
    const start = { ...emptyStatus(), online: true, core: 'GAMEBOY' }
    expect(applyWsMessage('indexStatus:n,n,0,0,', start)).toEqual(start)
    expect(applyWsMessage('no-colon-here', start)).toEqual(start)
    expect(applyWsMessage('somethingElse:value', start)).toEqual(start)
  })
})
