import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ControlTab } from './ControlTab'

const launchGame = vi.fn().mockResolvedValue(undefined)
const reboot = vi.fn().mockResolvedValue(undefined)

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

beforeEach(() => {
  launchGame.mockClear()
  reboot.mockClear()
  ;(globalThis as any).window.api = { launchGame, reboot }
})

describe('ControlTab', () => {
  it('launches the typed game path', () => {
    render(<ControlTab />)
    fireEvent.change(screen.getByPlaceholderText(/path to game/i), {
      target: { value: '/media/fat/games/SNES/Zelda.sfc' }
    })
    fireEvent.click(screen.getByRole('button', { name: /^launch$/i }))
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
