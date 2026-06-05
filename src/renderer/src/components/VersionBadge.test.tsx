import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { VersionBadge } from './VersionBadge'

const checkUpdate = vi.fn()
const openExternal = vi.fn().mockResolvedValue(undefined)

beforeEach(() => {
  checkUpdate.mockReset()
  openExternal.mockClear()
  ;(globalThis as any).window.api = { checkUpdate, openExternal }
})

describe('VersionBadge', () => {
  it('shows the current version and no update button when up to date', async () => {
    checkUpdate.mockResolvedValue({ current: '0.2.18', latest: '0.2.18', url: '', hasUpdate: false })
    render(<VersionBadge />)
    await waitFor(() => screen.getByText('v0.2.18'))
    expect(screen.queryByRole('button', { name: /^update$/i })).toBeNull()
  })

  it('offers an update button that opens a confirm modal and then the download page', async () => {
    checkUpdate.mockResolvedValue({
      current: '0.2.18',
      latest: '0.3.0',
      url: 'https://github.com/hudsonbrendon/mister-companion/releases/latest',
      hasUpdate: true
    })
    render(<VersionBadge />)
    await waitFor(() => screen.getByText('v0.2.18'))

    fireEvent.click(screen.getByRole('button', { name: /^update$/i }))
    await screen.findByText(/Update MiSTer Companion\?/i)
    expect(openExternal).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /open download/i }))
    await waitFor(() =>
      expect(openExternal).toHaveBeenCalledWith(
        'https://github.com/hudsonbrendon/mister-companion/releases/latest'
      )
    )
  })
})
