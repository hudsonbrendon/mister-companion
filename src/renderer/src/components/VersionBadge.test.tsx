import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { VersionBadge } from './VersionBadge'

const checkUpdate = vi.fn()
const selfUpdate = vi.fn()
const relaunchApp = vi.fn().mockResolvedValue(undefined)
const onSelfUpdateOutput = vi.fn().mockReturnValue(() => {})
const openExternal = vi.fn().mockResolvedValue(undefined)

beforeEach(() => {
  checkUpdate.mockReset()
  selfUpdate.mockReset()
  relaunchApp.mockClear()
  onSelfUpdateOutput.mockClear()
  openExternal.mockClear()
  ;(globalThis as any).window.api = {
    checkUpdate,
    selfUpdate,
    relaunchApp,
    onSelfUpdateOutput,
    openExternal
  }
})

describe('VersionBadge', () => {
  it('shows the current version and no update button when up to date', async () => {
    checkUpdate.mockResolvedValue({ current: '0.2.20', latest: '0.2.20', url: '', hasUpdate: false })
    render(<VersionBadge />)
    await waitFor(() => screen.getByText('v0.2.20'))
    expect(screen.queryByRole('button', { name: /^update$/i })).toBeNull()
  })

  it('confirms, runs the internal update, and offers a relaunch on success', async () => {
    checkUpdate.mockResolvedValue({ current: '0.2.20', latest: '0.2.21', url: '', hasUpdate: true })
    selfUpdate.mockResolvedValue({ ok: true, message: 'ok' })
    render(<VersionBadge />)
    await waitFor(() => screen.getByText('v0.2.20'))

    fireEvent.click(screen.getByRole('button', { name: /^update$/i }))
    expect(selfUpdate).not.toHaveBeenCalled()

    fireEvent.click(await screen.findByRole('button', { name: /update now/i }))
    await waitFor(() => expect(selfUpdate).toHaveBeenCalled())
    expect(onSelfUpdateOutput).toHaveBeenCalled()

    fireEvent.click(await screen.findByRole('button', { name: /relaunch now/i }))
    expect(relaunchApp).toHaveBeenCalled()
  })

  it('falls back to the download page when Homebrew is missing', async () => {
    checkUpdate.mockResolvedValue({
      current: '0.2.20',
      latest: '0.2.21',
      url: 'https://github.com/hudsonbrendon/mister-companion/releases/latest',
      hasUpdate: true
    })
    selfUpdate.mockResolvedValue({ ok: false, message: 'brew-not-found' })
    render(<VersionBadge />)
    await waitFor(() => screen.getByText('v0.2.20'))

    fireEvent.click(screen.getByRole('button', { name: /^update$/i }))
    fireEvent.click(await screen.findByRole('button', { name: /update now/i }))

    fireEvent.click(await screen.findByRole('button', { name: /open download/i }))
    expect(openExternal).toHaveBeenCalledWith(
      'https://github.com/hudsonbrendon/mister-companion/releases/latest'
    )
  })
})
