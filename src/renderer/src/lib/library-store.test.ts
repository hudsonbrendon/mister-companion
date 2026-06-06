import { describe, it, expect, beforeEach } from 'vitest'
import { getRecents, addRecent, getFavorites, isFavorite, toggleFavorite } from './library-store'

const game = (path: string, name = path): { name: string; path: string; systemId: string; systemName: string } => ({
  name,
  path,
  systemId: 'SNES',
  systemName: 'Super NES'
})

beforeEach(() => localStorage.clear())

describe('library-store', () => {
  it('adds recents most-recent-first and dedupes by path', () => {
    addRecent(game('/a'))
    addRecent(game('/b'))
    addRecent(game('/a'))
    expect(getRecents().map((g) => g.path)).toEqual(['/a', '/b'])
  })

  it('caps recents at 24', () => {
    for (let i = 0; i < 30; i++) addRecent(game(`/g${i}`))
    expect(getRecents()).toHaveLength(24)
    expect(getRecents()[0].path).toBe('/g29')
  })

  it('toggles favorites on and off', () => {
    expect(isFavorite('/a')).toBe(false)
    toggleFavorite(game('/a'))
    expect(isFavorite('/a')).toBe(true)
    expect(getFavorites()).toHaveLength(1)
    toggleFavorite(game('/a'))
    expect(isFavorite('/a')).toBe(false)
    expect(getFavorites()).toHaveLength(0)
  })
})
