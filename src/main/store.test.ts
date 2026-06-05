import { describe, it, expect } from 'vitest'
import { ProfileStore } from './store'

function memoryBacking() {
  const data = new Map<string, unknown>()
  return {
    get: (k: string, d: unknown) => (data.has(k) ? data.get(k) : d),
    set: (k: string, v: unknown) => data.set(k, v)
  }
}

describe('ProfileStore', () => {
  it('saves, lists, and deletes profiles by id', () => {
    const store = new ProfileStore(memoryBacking())
    store.save({ id: 'a', name: 'Living Room', host: '192.168.31.50', restPort: 8182, sshPort: 22 })
    expect(store.list()).toHaveLength(1)
    store.save({ id: 'a', name: 'Renamed', host: '192.168.31.50', restPort: 8182, sshPort: 22 })
    expect(store.list()[0].name).toBe('Renamed') // upsert, not duplicate
    store.delete('a')
    expect(store.list()).toHaveLength(0)
  })
})
