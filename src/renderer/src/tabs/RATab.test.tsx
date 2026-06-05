import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { RATab } from './RATab'

const raSummary = vi.fn().mockResolvedValue({
  hardcorePoints: 1234, softcorePoints: 50, rank: 42, totalRanked: 100000,
  currentGame: null,
  recentGames: [
    { gameId: 1, title: 'Sonic', console: 'Genesis', numAchieved: 5, numPossible: 50, percent: 10, iconUrl: null }
  ]
})

beforeEach(() => {
  raSummary.mockClear()
  ;(globalThis as any).window.api = { raSummary }
})

describe('RATab', () => {
  it('fetches and renders the RA summary after entering credentials', async () => {
    render(<RATab />)
    fireEvent.change(screen.getByPlaceholderText(/username/i), { target: { value: 'hudson' } })
    fireEvent.change(screen.getByPlaceholderText(/api key/i), { target: { value: 'key' } })
    fireEvent.click(screen.getByRole('button', { name: /load/i }))
    expect(raSummary).toHaveBeenCalledWith('hudson', 'key')
    await waitFor(() => screen.getByText(/1234/))
    expect(screen.getByText('Sonic')).toBeInTheDocument()
  })
})
