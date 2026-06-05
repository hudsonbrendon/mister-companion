import { describe, it, expect } from 'vitest'
import { IPC, emptyStatus } from '@shared/types'

describe('shared types', () => {
  it('exposes stable IPC channel names', () => {
    expect(IPC.getStatus).toBe('mister:getStatus')
    expect(IPC.statusUpdate).toBe('mister:statusUpdate')
    expect(IPC.launchGame).toBe('mister:launchGame')
  })

  it('emptyStatus is offline with null fields and empty ips', () => {
    const s = emptyStatus()
    expect(s.online).toBe(false)
    expect(s.core).toBeNull()
    expect(s.ips).toEqual([])
    expect(s.diskTotal).toBeNull()
  })
})
