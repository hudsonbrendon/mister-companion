import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MediaTab } from './MediaTab'

const setWallpaper = vi.fn().mockResolvedValue(undefined)

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

beforeEach(() => {
  setWallpaper.mockClear()
  ;(globalThis as any).window.api = {
    getWallpapers: vi.fn().mockResolvedValue({
      active: '',
      backgroundMode: 2,
      wallpapers: [{ name: 'Amiga', filename: 'amiga.png', active: false, imageUrl: 'http://x/api/wallpapers/amiga.png' }]
    }),
    getScreenshots: vi.fn().mockResolvedValue([]),
    setWallpaper,
    unsetWallpaper: vi.fn().mockResolvedValue(undefined),
    takeScreenshot: vi.fn().mockResolvedValue(undefined),
    deleteScreenshot: vi.fn().mockResolvedValue(undefined),
    musicStatus: vi.fn().mockResolvedValue({ running: false, playing: false, playback: '', playlist: '', track: '' }),
    musicPlaylists: vi.fn().mockResolvedValue([])
  }
})

describe('MediaTab', () => {
  it('lists wallpapers and sets one on click', async () => {
    render(<MediaTab />)
    const img = await screen.findByAltText('Amiga')
    expect(img).toHaveAttribute('src', 'http://x/api/wallpapers/amiga.png')
    fireEvent.click(img)
    await waitFor(() => expect(setWallpaper).toHaveBeenCalledWith('amiga.png'))
  })
})
