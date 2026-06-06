import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MusicPlayer } from './MusicPlayer'

const musicStatus = vi.fn()
const musicPlaylists = vi.fn()
const musicPlay = vi.fn().mockResolvedValue(undefined)
const musicStop = vi.fn().mockResolvedValue(undefined)
const musicNext = vi.fn().mockResolvedValue(undefined)
const musicPlayback = vi.fn().mockResolvedValue(undefined)
const musicSetPlaylist = vi.fn().mockResolvedValue(undefined)

beforeEach(() => {
  vi.clearAllMocks()
  musicStatus.mockResolvedValue({ running: false, playing: false, playback: '', playlist: '', track: '' })
  musicPlaylists.mockResolvedValue([])
  ;(globalThis as any).window.api = {
    musicStatus,
    musicPlaylists,
    musicPlay,
    musicStop,
    musicNext,
    musicPlayback,
    musicSetPlaylist
  }
})

describe('MusicPlayer', () => {
  it('shows a service-off note and a Play button when the BGM service is not running', async () => {
    render(<MusicPlayer />)
    await waitFor(() => screen.getByText(/isn't running/i))
    expect(screen.getByRole('button', { name: /^play$/i })).toBeInTheDocument()
  })

  it('plays and skips tracks', async () => {
    render(<MusicPlayer />)
    fireEvent.click(await screen.findByRole('button', { name: /^play$/i }))
    await waitFor(() => expect(musicPlay).toHaveBeenCalled())
    fireEvent.click(screen.getByRole('button', { name: /^next$/i }))
    await waitFor(() => expect(musicNext).toHaveBeenCalled())
  })

  it('shows the current track and a Stop button while playing', async () => {
    musicStatus.mockResolvedValue({
      running: true,
      playing: true,
      playback: 'random',
      playlist: 'pl',
      track: 'Cool Track'
    })
    render(<MusicPlayer />)
    await waitFor(() => screen.getByText('Cool Track'))
    expect(screen.getByRole('button', { name: /^stop$/i })).toBeInTheDocument()
  })
})
