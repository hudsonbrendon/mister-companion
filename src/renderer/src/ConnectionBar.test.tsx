import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ConnectionBar } from './ConnectionBar'

const connect = vi.fn().mockResolvedValue(true)
const discover = vi.fn().mockResolvedValue([{ host: '192.168.31.50', hostname: 'MiSTer', source: 'scan' }])
const toastSuccess = vi.fn()

vi.mock('sonner', () => ({
  toast: { success: (...a: unknown[]) => toastSuccess(...a), error: vi.fn() }
}))

beforeEach(() => {
  connect.mockClear()
  discover.mockClear()
  toastSuccess.mockClear()
  const api = { listProfiles: vi.fn().mockResolvedValue([]), discover, connect, saveProfile: vi.fn().mockResolvedValue([]) }
  ;(globalThis as any).window.api = api
})

describe('ConnectionBar', () => {
  it('discovers devices and connects to a chosen one, toasting success', async () => {
    render(<ConnectionBar localIp="192.168.31.20" />)
    fireEvent.click(screen.getByRole('button', { name: /discover/i }))
    await waitFor(() => screen.getByText(/192\.168\.31\.50/))
    fireEvent.click(screen.getByText(/192\.168\.31\.50/))
    await waitFor(() => expect(connect).toHaveBeenCalled())
    expect(connect.mock.calls[0][0].host).toBe('192.168.31.50')
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled())
  })

  it('renders saved profiles and connects on click', async () => {
    (window.api as any).listProfiles = vi
      .fn()
      .mockResolvedValue([{ id: 'p1', name: 'Saved', host: '192.168.31.99', restPort: 8182, sshPort: 22 }])
    render(<ConnectionBar localIp="192.168.31.20" />)
    await waitFor(() => screen.getByRole('button', { name: /saved/i }))
    fireEvent.click(screen.getByRole('button', { name: /saved/i }))
    await waitFor(() => expect(connect).toHaveBeenCalledWith(expect.objectContaining({ host: '192.168.31.99' })))
  })
})
