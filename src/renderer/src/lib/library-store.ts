import { GameResult } from '@shared/types'

// Local (app-side) recents + favorites, persisted in localStorage. The mrext API has no
// play history or favorites store, so we keep our own keyed by game path.
const RECENTS_KEY = 'recents'
const FAVORITES_KEY = 'favorites'
const MAX_RECENTS = 24

function read(key: string): GameResult[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

function write(key: string, list: GameResult[]): void {
  if (typeof localStorage !== 'undefined') localStorage.setItem(key, JSON.stringify(list))
}

export function getRecents(): GameResult[] {
  return read(RECENTS_KEY)
}

export function addRecent(game: GameResult): GameResult[] {
  const list = [game, ...read(RECENTS_KEY).filter((g) => g.path !== game.path)].slice(0, MAX_RECENTS)
  write(RECENTS_KEY, list)
  return list
}

export function getFavorites(): GameResult[] {
  return read(FAVORITES_KEY)
}

export function isFavorite(path: string): boolean {
  return read(FAVORITES_KEY).some((g) => g.path === path)
}

export function toggleFavorite(game: GameResult): GameResult[] {
  const cur = read(FAVORITES_KEY)
  const exists = cur.some((g) => g.path === game.path)
  const list = exists ? cur.filter((g) => g.path !== game.path) : [game, ...cur]
  write(FAVORITES_KEY, list)
  return list
}
