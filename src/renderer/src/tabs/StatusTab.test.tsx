import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { StatusTab } from './StatusTab'
import { emptyStatus } from '@shared/types'

let pushStatus: (s: any) => void = () => {}

beforeEach(() => {
  (globalThis as any).window.api = {
    startStatusFeed: vi.fn().mockResolvedValue(true),
    onStatusUpdate: (cb: (s: any) => void) => { pushStatus = cb; return () => {} }
  }
})

describe('StatusTab', () => {
  it('shows Offline initially then renders live core/game when a status arrives', async () => {
    render(<StatusTab />)
    expect(screen.getByText(/offline/i)).toBeInTheDocument()
    await act(async () => {
      pushStatus({ ...emptyStatus(), online: true, core: 'SNES', game: 'Chrono Trigger' })
    })
    expect(screen.getByText('SNES')).toBeInTheDocument()
    expect(screen.getByText('Chrono Trigger')).toBeInTheDocument()
  })
})
