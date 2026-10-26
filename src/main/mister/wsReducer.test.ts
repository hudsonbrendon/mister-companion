import { describe, it, expect } from 'vitest'
import { emptyStatus, type MisterStatus } from '@shared/types'
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

  it('strips the system prefix and extension from gameRunning (system/file)', () => {
    const start = { ...emptyStatus(), online: true, core: 'SNES' }
    expect(applyWsMessage('gameRunning:SNES/Chrono Trigger (USA).sfc', start).game).toBe('Chrono Trigger (USA)')
  })

  it('keeps the bare arcade name from gameRunning', () => {
    const start = { ...emptyStatus(), online: true, core: 'sf2' }
    expect(applyWsMessage('gameRunning:sf2', start).game).toBe('sf2')
  })

  it('clears the stale game and system when a different core starts', () => {
    const start = { ...emptyStatus(), online: true, core: 'SNES', system: 'SNES', game: 'Zelda' }
    const next = applyWsMessage('coreRunning:GBA', start)
    expect(next.core).toBe('GBA')
    expect(next.game).toBeNull()
    expect(next.system).toBeNull()
    expect(applyWsMessage('coreRunning:SNES', start)).toEqual(start)
  })

  it('keeps the game when coreRunning follows gameRunning on launch', () => {
    let s: MisterStatus = { ...emptyStatus(), online: true, core: 'sf2' }
    for (const frame of ['coreRunning:', 'gameRunning:SNES/Dr. Mario.sfc', 'coreRunning:SNES']) {
      s = applyWsMessage(frame, s)
    }
    expect(s.core).toBe('SNES')
    expect(s.game).toBe('Dr. Mario')
  })
})
