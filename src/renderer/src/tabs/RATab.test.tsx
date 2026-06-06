import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { RATab } from './RATab'

const raSummary = vi.fn().mockResolvedValue({
  user: 'hudson',
  userPic: null,
  motto: 'Gotta go fast',
  memberSince: '2018-01-02 00:00:00',
  richPresence: 'Playing Sonic the Hedgehog',
  status: 'Offline',
  hardcorePoints: 1234,
  softcorePoints: 50,
  truePoints: 777,
  rank: 42,
  totalRanked: 100000,
  recentlyPlayedCount: 1,
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

const link = (user = 'hudson', key = 'key') => {
  fireEvent.change(screen.getByPlaceholderText(/username/i), { target: { value: user } })
  fireEvent.change(screen.getByPlaceholderText(/api key/i), { target: { value: key } })
  fireEvent.click(screen.getByRole('button', { name: /save/i }))
}

beforeEach(() => {
  raSummary.mockClear()
  raRecent.mockClear()
  raGameProgress.mockClear()
  localStorage.clear()
  ;(globalThis as any).window.api = { raSummary, raRecent, raGameProgress }
})

afterEach(() => cleanup())

describe('RATab', () => {
  it('links an account and fetches the summary + recent unlocks', async () => {
    render(<RATab />)
    link()
    await waitFor(() => expect(raSummary).toHaveBeenCalledWith('hudson', 'key'))
    await waitFor(() => screen.getByText('Sonic'))
    expect(screen.getByText('Sonic')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText(/recent unlocks/i)).toBeInTheDocument())
    expect(screen.getByText('First Blood')).toBeInTheDocument()
  })

  it('opens the achievement dialog when a game is clicked', async () => {
    render(<RATab />)
    link()
    await waitFor(() => screen.getByText('Sonic'))
    fireEvent.click(screen.getByText('Sonic'))
    expect(raGameProgress).toHaveBeenCalledWith('hudson', 'key', 1)
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
  })

  it('auto-loads data on mount when an account is already linked, without clicking', async () => {
    localStorage.setItem('ra.username', 'hudson')
    localStorage.setItem('ra.apiKey', 'secret-key')
    render(<RATab />)
    await waitFor(() => expect(raSummary).toHaveBeenCalledWith('hudson', 'secret-key'))
    await waitFor(() => screen.getByText('Sonic'))
    // the add-account form is not shown; the linked header is
    expect(screen.queryByRole('button', { name: /^save$/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /refresh now/i })).toBeInTheDocument()
  })

  it('refetches when "Refresh now" is clicked', async () => {
    localStorage.setItem('ra.username', 'hudson')
    localStorage.setItem('ra.apiKey', 'secret-key')
    render(<RATab />)
    await waitFor(() => expect(raSummary).toHaveBeenCalledTimes(1))
    fireEvent.click(screen.getByRole('button', { name: /refresh now/i }))
    await waitFor(() => expect(raSummary).toHaveBeenCalledTimes(2))
  })

  it('asks for confirmation before unlinking and only clears on confirm', async () => {
    localStorage.setItem('ra.username', 'hudson')
    localStorage.setItem('ra.apiKey', 'secret-key')
    render(<RATab />)
    await waitFor(() => screen.getByText('Sonic'))

    // clicking Unlink opens a confirmation modal but does NOT clear anything yet
    fireEvent.click(screen.getByRole('button', { name: /^unlink$/i }))
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    expect(localStorage.getItem('ra.username')).toBe('hudson')

    // confirming clears persistence and returns to the add-account form
    fireEvent.click(screen.getByRole('button', { name: /yes, unlink/i }))
    expect(localStorage.getItem('ra.username')).toBeFalsy()
    expect(localStorage.getItem('ra.apiKey')).toBeFalsy()
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
  })

  it('shows the last-updated time after loading', async () => {
    localStorage.setItem('ra.username', 'hudson')
    localStorage.setItem('ra.apiKey', 'secret-key')
    render(<RATab />)
    await waitFor(() => screen.getByText('Sonic'))
    expect(screen.getByText(/updated/i)).toBeInTheDocument()
  })

  it('renders the enriched profile (motto + rich presence)', async () => {
    localStorage.setItem('ra.username', 'hudson')
    localStorage.setItem('ra.apiKey', 'secret-key')
    render(<RATab />)
    await waitFor(() => screen.getByText('Sonic'))
    expect(screen.getByText(/Gotta go fast/)).toBeInTheDocument()
    expect(screen.getByText('Playing Sonic the Hedgehog')).toBeInTheDocument()
    expect(screen.getByText(/777/)).toBeInTheDocument()
  })

  it('derives presence from rich presence, not the unreliable Status field', async () => {
    // mock has status:'Offline' but an active rich-presence message → should read Playing
    localStorage.setItem('ra.username', 'hudson')
    localStorage.setItem('ra.apiKey', 'secret-key')
    render(<RATab />)
    await waitFor(() => screen.getByText('Sonic'))
    expect(screen.getByText('Playing')).toBeInTheDocument()
    expect(screen.queryByText('Offline')).not.toBeInTheDocument()
  })

  it('persists the linked account across a remount', async () => {
    const { unmount } = render(<RATab />)
    link('hudson', 'secret-key')
    await waitFor(() => expect(raSummary).toHaveBeenCalled())
    unmount()
    cleanup()
    raSummary.mockClear()

    render(<RATab />)
    await waitFor(() => expect(raSummary).toHaveBeenCalledWith('hudson', 'secret-key'))
  })
})
