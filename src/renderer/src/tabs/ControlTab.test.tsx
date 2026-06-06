import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ControlTab } from './ControlTab'

const reboot = vi.fn().mockResolvedValue(undefined)
const sendKey = vi.fn().mockResolvedValue(undefined)

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

beforeEach(() => {
  reboot.mockClear()
  sendKey.mockClear()
  ;(globalThis as any).window.api = { reboot, sendKey }
})

describe('ControlTab', () => {
  it('sends a virtual key from the remote control', () => {
    render(<ControlTab />)
    fireEvent.click(screen.getByRole('button', { name: /^OK$/i }))
    expect(sendKey).toHaveBeenCalledWith('enter')
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
