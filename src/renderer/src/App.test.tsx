import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { App } from './App'

beforeEach(() => {
  (globalThis as any).window.api = {
    listProfiles: vi.fn().mockResolvedValue([]),
    startStatusFeed: vi.fn().mockResolvedValue(true),
    onStatusUpdate: vi.fn().mockReturnValue(() => {}),
    listScripts: vi.fn().mockResolvedValue([]),
    onScriptOutput: vi.fn().mockReturnValue(() => {})
  }
})

describe('App', () => {
  it('renders the five tabs and switches the active tab on click', async () => {
    render(<App />)
    expect(screen.getByRole('tab', { name: /status/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /control/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: /scripts/i }))
    // Flush ScriptsTab's async listScripts() state update to avoid act() warning.
    await waitFor(() => expect((globalThis as any).window.api.listScripts).toHaveBeenCalled())
    expect(screen.getByRole('tab', { name: /scripts/i })).toHaveAttribute('aria-selected', 'true')
  })
})
