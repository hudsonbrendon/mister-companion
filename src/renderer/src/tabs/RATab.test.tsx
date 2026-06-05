import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { RATab } from './RATab'

const raSummary = vi.fn().mockResolvedValue({
  hardcorePoints: 1234,
  softcorePoints: 50,
  rank: 42,
  totalRanked: 100000,
  currentGame: null,
  recentGames: [
    { gameId: 1, title: 'Sonic', console: 'Genesis', numAchieved: 5, numPossible: 50, percent: 10, iconUrl: null }
  ]
})

const raRecent = vi.fn().mockResolvedValue([
  { title: 'First Blood', description: 'win', points: 10, gameId: 1, gameTitle: 'Sonic', console: 'Genesis', date: '2026-06-05', badgeUrl: null }
])
const raGameProgress = vi.fn().mockResolvedValue({
  title: 'Sonic', console: 'Genesis', iconUrl: null, numAwarded: 5, numAchievements: 50,
  achievements: [{ id: 1, title: 'Ach', description: 'd', points: 5, badgeUrl: null, earned: true, dateEarned: '2026-06-05' }]
})

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

beforeEach(() => {
  raSummary.mockClear()
  raRecent.mockClear()
  raGameProgress.mockClear()
  ;(globalThis as any).window.api = { raSummary, raRecent, raGameProgress }
})

describe('RATab', () => {
  it('fetches and renders the RA summary + recent unlocks after entering credentials', async () => {
    render(<RATab />)
    fireEvent.change(screen.getByPlaceholderText(/username/i), { target: { value: 'hudson' } })
    fireEvent.change(screen.getByPlaceholderText(/api key/i), { target: { value: 'key' } })
    fireEvent.click(screen.getByRole('button', { name: /load/i }))
    expect(raSummary).toHaveBeenCalledWith('hudson', 'key')
    await waitFor(() => screen.getByText(/1234/))
    expect(screen.getByText('Sonic')).toBeInTheDocument()
    // recent unlocks section
    await waitFor(() => expect(screen.getByText(/recent unlocks/i)).toBeInTheDocument())
    expect(screen.getByText('First Blood')).toBeInTheDocument()
  })

  it('opens the achievement dialog when a game is clicked', async () => {
    render(<RATab />)
    fireEvent.change(screen.getByPlaceholderText(/username/i), { target: { value: 'hudson' } })
    fireEvent.change(screen.getByPlaceholderText(/api key/i), { target: { value: 'key' } })
    fireEvent.click(screen.getByRole('button', { name: /load/i }))
    await waitFor(() => screen.getByText('Sonic'))
    fireEvent.click(screen.getByText('Sonic'))
    expect(raGameProgress).toHaveBeenCalledWith('hudson', 'key', 1)
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
  })
})
