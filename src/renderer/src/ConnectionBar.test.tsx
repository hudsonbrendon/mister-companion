import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ConnectionBar } from './ConnectionBar'

const connect = vi.fn().mockResolvedValue(true)
const discover = vi.fn().mockResolvedValue([
  { host: '192.168.31.50', hostname: 'MiSTer', source: 'scan' }
])

beforeEach(() => {
  connect.mockClear(); discover.mockClear();
  (globalThis as any).window.api = {
    listProfiles: vi.fn().mockResolvedValue([]),
    discover,
    connect,
    saveProfile: vi.fn().mockResolvedValue([])
  }
})

describe('ConnectionBar', () => {
  it('discovers devices and connects to a chosen one', async () => {
    render(<ConnectionBar localIp="192.168.31.20" />)
    fireEvent.click(screen.getByRole('button', { name: /discover/i }))
    await waitFor(() => screen.getByText(/192\.168\.31\.50/))
    fireEvent.click(screen.getByText(/192\.168\.31\.50/))
    await waitFor(() => expect(connect).toHaveBeenCalled())
    expect(connect.mock.calls[0][0].host).toBe('192.168.31.50')
  })

  it('renders saved profiles and connects when clicked', async () => {
    (globalThis as any).window.api.listProfiles = vi.fn().mockResolvedValue([
      { id: 'p1', name: 'Saved', host: '192.168.31.99', restPort: 8182, sshPort: 22 }
    ])
    render(<ConnectionBar localIp="192.168.31.20" />)
    await waitFor(() => screen.getByRole('button', { name: 'Saved' }))
    fireEvent.click(screen.getByRole('button', { name: 'Saved' }))
    await waitFor(() => expect(connect).toHaveBeenCalled())
    expect(connect.mock.calls[0][0].host).toBe('192.168.31.99')
  })
})
