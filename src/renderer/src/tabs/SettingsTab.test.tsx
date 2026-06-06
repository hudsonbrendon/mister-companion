import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SettingsTab } from './SettingsTab'

const listInis = vi.fn()
const readIni = vi.fn()
const writeIni = vi.fn()
const setActiveIni = vi.fn()

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

beforeEach(() => {
  vi.clearAllMocks()
  listInis.mockResolvedValue({
    active: 1,
    inis: [
      { id: 1, displayName: 'Main', filename: 'MiSTer.ini', path: '/media/fat/MiSTer.ini' },
      { id: 2, displayName: 'CRT', filename: 'MiSTer_CRT.ini', path: '/media/fat/MiSTer_CRT.ini' }
    ]
  })
  readIni.mockResolvedValue({ __hostname: 'MiSTer', bootcore_timeout: '10', hdr: '1' })
  writeIni.mockResolvedValue(undefined)
  setActiveIni.mockResolvedValue(undefined)
  ;(globalThis as any).window.api = { listInis, readIni, writeIni, setActiveIni }
})

describe('SettingsTab', () => {
  it('loads the active profile and shows editable keys but not __ meta as a field', async () => {
    render(<SettingsTab />)
    await waitFor(() => screen.getByText('bootcore_timeout'))
    expect(screen.getByText('hdr')).toBeInTheDocument()
    expect(screen.queryByText('__hostname')).toBeNull()
  })

  it('saves only the changed keys (merge semantics)', async () => {
    render(<SettingsTab />)
    const input = await screen.findByDisplayValue('10')
    fireEvent.change(input, { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    await waitFor(() => expect(writeIni).toHaveBeenCalledWith(1, { bootcore_timeout: '5' }))
  })

  it('switches the active profile', async () => {
    render(<SettingsTab />)
    await waitFor(() => screen.getByText('bootcore_timeout'))
    fireEvent.click(screen.getByText('CRT'))
    fireEvent.click(await screen.findByRole('button', { name: /make active/i }))
    await waitFor(() => expect(setActiveIni).toHaveBeenCalledWith(2))
  })
})
