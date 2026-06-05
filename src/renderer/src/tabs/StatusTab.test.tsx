import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { StatusTab } from './StatusTab'
import { StatusProvider } from '../hooks/status-context'
import { emptyStatus } from '@shared/types'

let pushStatus: (s: any) => void = () => {}

beforeEach(() => {
  ;(globalThis as any).window.api = {
    startStatusFeed: vi.fn().mockResolvedValue(true),
    onStatusUpdate: (cb: (s: any) => void) => {
      pushStatus = cb
      return () => {}
    }
  }
})

describe('StatusTab dashboard', () => {
  it('shows Offline first, then live core/game and disk usage', async () => {
    render(
      <StatusProvider>
        <StatusTab />
      </StatusProvider>
    )
    expect(screen.getByText(/offline/i)).toBeInTheDocument()
    await act(async () => {
      pushStatus({
        ...emptyStatus(),
        online: true,
        core: 'SNES',
        game: 'Chrono Trigger',
        diskTotal: 32_000_000_000,
        diskUsed: 24_000_000_000,
        diskFree: 8_000_000_000
      })
    })
    expect(screen.getByText('SNES')).toBeInTheDocument()
    expect(screen.getByText('Chrono Trigger')).toBeInTheDocument()
    expect(screen.getByText(/24\.0 GB/)).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })
})
