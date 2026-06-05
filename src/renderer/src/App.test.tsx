import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { App } from './App'

beforeEach(() => {
  ;(globalThis as any).window.api = {
    listProfiles: vi.fn().mockResolvedValue([]),
    discover: vi.fn().mockResolvedValue([]),
    connect: vi.fn().mockResolvedValue(true),
    saveProfile: vi.fn().mockResolvedValue([]),
    startStatusFeed: vi.fn().mockResolvedValue(true),
    onStatusUpdate: vi.fn().mockReturnValue(() => {}),
    onScriptOutput: vi.fn().mockReturnValue(() => {}),
    listScripts: vi.fn().mockResolvedValue([]),
    smbList: vi.fn().mockResolvedValue([])
  }
})

describe('App shell', () => {
  it('renders a vertical tablist with the five screens and the brand', async () => {
    render(<App />)
    expect(screen.getByRole('tablist')).toHaveAttribute('aria-orientation', 'vertical')
    expect(screen.getByRole('tab', { name: /status/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /control/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /scripts/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /files/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /retroachievements/i })).toBeInTheDocument()
    expect(screen.getByAltText(/mister companion/i)).toBeInTheDocument()
  })

  it('switches the active screen on nav click', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('tab', { name: /scripts/i }))
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: /scripts/i })).toHaveAttribute('aria-selected', 'true')
    )
  })
})
