import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ControlTab } from './ControlTab'

const launchGame = vi.fn().mockResolvedValue(undefined)
const reboot = vi.fn().mockResolvedValue(undefined)

beforeEach(() => {
  launchGame.mockClear(); reboot.mockClear()
  ;(globalThis as any).window.api = { launchGame, reboot }
})

describe('ControlTab', () => {
  it('launches the typed game path', () => {
    render(<ControlTab />)
    fireEvent.change(screen.getByPlaceholderText(/path to game/i), {
      target: { value: '/media/fat/games/SNES/Zelda.sfc' }
    })
    fireEvent.click(screen.getByRole('button', { name: /launch/i }))
    expect(launchGame).toHaveBeenCalledWith('/media/fat/games/SNES/Zelda.sfc')
  })

  it('calls reboot when the reboot button is clicked', () => {
    render(<ControlTab />)
    fireEvent.click(screen.getByRole('button', { name: /reboot/i }))
    expect(reboot).toHaveBeenCalled()
  })
})
