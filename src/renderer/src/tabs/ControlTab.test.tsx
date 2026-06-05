import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ControlTab } from './ControlTab'

const launchGame = vi.fn().mockResolvedValue(undefined)
const reboot = vi.fn().mockResolvedValue(undefined)
const searchSystems = vi.fn().mockResolvedValue([{ id: 'SNES', name: 'SNES' }])
const searchGames = vi.fn().mockResolvedValue([
  { name: 'Zelda', path: '/media/fat/games/SNES/Zelda.sfc', systemId: 'SNES', systemName: 'SNES' }
])
const generateIndex = vi.fn().mockResolvedValue(undefined)
const onIndexStatus = vi.fn().mockReturnValue(() => {})

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

beforeEach(() => {
  launchGame.mockClear()
  reboot.mockClear()
  searchSystems.mockClear()
  searchGames.mockClear()
  generateIndex.mockClear()
  onIndexStatus.mockClear()
  ;(globalThis as any).window.api = {
    launchGame,
    reboot,
    searchSystems,
    searchGames,
    generateIndex,
    onIndexStatus
  }
})

describe('ControlTab', () => {
  it('searches for games and launches via the result list', async () => {
    render(<ControlTab />)

    // Wait for the search input to appear (index is loaded)
    const input = await screen.findByPlaceholderText(/search games/i)
    fireEvent.change(input, { target: { value: 'Zelda' } })

    // Wait for the debounce + result to appear
    const launchBtn = await screen.findByRole('button', { name: /launch/i })
    expect(screen.getByText('Zelda')).toBeInTheDocument()
    fireEvent.click(launchBtn)

    expect(launchGame).toHaveBeenCalledWith('/media/fat/games/SNES/Zelda.sfc')
  })

  it('reboots only after confirming in the dialog', async () => {
    render(<ControlTab />)
    fireEvent.click(screen.getByRole('button', { name: /reboot/i }))
    const confirm = await screen.findByRole('button', { name: /confirm reboot/i })
    expect(reboot).not.toHaveBeenCalled()
    fireEvent.click(confirm)
    await waitFor(() => expect(reboot).toHaveBeenCalledTimes(1))
  })
})
