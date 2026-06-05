import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { App } from './App'

beforeEach(() => {
  (globalThis as any).window.api = {
    listProfiles: vi.fn().mockResolvedValue([]),
    discover: vi.fn().mockResolvedValue([]),
    connect: vi.fn().mockResolvedValue(true),
    saveProfile: vi.fn().mockResolvedValue([]),
    startStatusFeed: vi.fn().mockResolvedValue(true),
    onStatusUpdate: vi.fn().mockReturnValue(() => {}),
    onScriptOutput: vi.fn().mockReturnValue(() => {}),
    listScripts: vi.fn().mockResolvedValue([]),
    smbList: vi.fn().mockResolvedValue([]),
    searchSystems: vi.fn().mockResolvedValue([]),
    searchGames: vi.fn().mockResolvedValue([]),
    onIndexStatus: vi.fn().mockReturnValue(() => {}),
    generateIndex: vi.fn(),
    sendKey: vi.fn().mockResolvedValue(undefined),
    raSummary: vi.fn().mockResolvedValue({ hardcorePoints: 0, softcorePoints: 0, rank: 0, totalRanked: 0, currentGame: null, recentGames: [] }),
    raRecent: vi.fn().mockResolvedValue([]),
    raGameProgress: vi.fn().mockResolvedValue({ title: '', console: '', iconUrl: null, numAwarded: 0, numAchievements: 0, achievements: [] }),
    checkUpdate: vi.fn().mockResolvedValue({ current: '0.0.0', latest: '0.0.0', url: '', hasUpdate: false }),
    openExternal: vi.fn().mockResolvedValue(undefined),
    getWallpapers: vi.fn().mockResolvedValue({ active: '', backgroundMode: 0, wallpapers: [] }),
    setWallpaper: vi.fn().mockResolvedValue(undefined),
    unsetWallpaper: vi.fn().mockResolvedValue(undefined),
    getScreenshots: vi.fn().mockResolvedValue([]),
    takeScreenshot: vi.fn().mockResolvedValue(undefined),
    deleteScreenshot: vi.fn().mockResolvedValue(undefined)
  }
})

describe('App shell', () => {
  it('renders a vertical tablist with the five screens and the brand', async () => {
    await act(async () => { render(<App />) })
    expect(screen.getByRole('tablist')).toHaveAttribute('aria-orientation', 'vertical')
    expect(screen.getByRole('tab', { name: /status/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /control/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /scripts/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /files/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /media/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /retroachievements/i })).toBeInTheDocument()
    expect(screen.getByText('MiSTer Companion')).toBeInTheDocument()
  })

  it('switches the active screen on nav click', async () => {
    await act(async () => { render(<App />) })
    fireEvent.click(screen.getByRole('tab', { name: /scripts/i }))
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: /scripts/i })).toHaveAttribute('aria-selected', 'true')
    )
  })
})
