import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { GamesTab } from './GamesTab'

const searchSystems = vi.fn()
const listSystems = vi.fn()
const searchGames = vi.fn()
const onIndexStatus = vi.fn()
const generateIndex = vi.fn()
const launchGame = vi.fn()

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

beforeEach(() => {
  vi.clearAllMocks()
  searchSystems.mockResolvedValue([{ id: 'SNES', name: 'Super NES' }])
  listSystems.mockResolvedValue([
    { id: 'SNES', name: 'Super NES', category: 'Console' },
    { id: 'Gameboy', name: 'Game Boy', category: 'Console' },
    { id: 'PCXT', name: 'PC/XT', category: 'Computer' }
  ])
  searchGames.mockResolvedValue([
    {
      name: 'Super Mario World',
      path: '/media/fat/games/SNES/smw.sfc',
      systemId: 'SNES',
      systemName: 'Super NES'
    }
  ])
  onIndexStatus.mockReturnValue(() => {})
  ;(globalThis as any).window.api = {
    searchSystems,
    listSystems,
    searchGames,
    onIndexStatus,
    generateIndex,
    launchGame
  }
})

describe('GamesTab', () => {
  it('lists platforms grouped by category once indexed', async () => {
    render(<GamesTab />)
    await waitFor(() => screen.getByText('Super NES'))
    expect(screen.getByText('Game Boy')).toBeInTheDocument()
    expect(screen.getByText('PC/XT')).toBeInTheDocument()
  })

  it('opens a platform and lists its games (empty query lists all)', async () => {
    render(<GamesTab />)
    await waitFor(() => screen.getByText('Super NES'))
    fireEvent.click(screen.getByText('Super NES'))
    await waitFor(() => expect(searchGames).toHaveBeenCalledWith('', 'SNES'))
    expect(await screen.findByText('Super Mario World')).toBeInTheDocument()
  })

  it('global search queries across all systems', async () => {
    render(<GamesTab />)
    await waitFor(() => screen.getByText('Super NES'))
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'zelda' } })
    await waitFor(() => expect(searchGames).toHaveBeenCalledWith('zelda', 'all'))
  })
})
