import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FilesTab } from './FilesTab'

const smbList = vi.fn()
const readFile = vi.fn().mockResolvedValue('[MiSTer]\nvideo_mode=8')
const writeFile = vi.fn().mockResolvedValue(undefined)
const deleteFile = vi.fn().mockResolvedValue(undefined)

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

beforeEach(() => {
  smbList.mockReset()
  readFile.mockClear()
  writeFile.mockClear()
  deleteFile.mockClear()
  smbList.mockResolvedValue([
    { name: 'games', isDirectory: true, size: 0 },
    { name: 'MiSTer.ini', isDirectory: false, size: 2048 }
  ])
  ;(globalThis as any).window.api = { smbList, readFile, writeFile, deleteFile }
})

describe('FilesTab', () => {
  it('lists the root on mount and navigates into a directory on click', async () => {
    render(<FilesTab />)
    await waitFor(() => screen.getByText('games'))
    expect(smbList).toHaveBeenCalledWith('sdcard', '')
    smbList.mockResolvedValueOnce([{ name: 'SNES', isDirectory: true, size: 0 }])
    fireEvent.click(screen.getByText('games'))
    await waitFor(() => expect(smbList).toHaveBeenCalledWith('sdcard', 'games'))
  })

  it('opens a text file in the editor and saves it', async () => {
    render(<FilesTab />)
    await waitFor(() => screen.getByText('MiSTer.ini'))
    fireEvent.click(screen.getByText('MiSTer.ini'))
    expect(readFile).toHaveBeenCalledWith('MiSTer.ini')
    const textarea = await screen.findByDisplayValue(/video_mode=8/)
    fireEvent.change(textarea, { target: { value: '[MiSTer]\nvideo_mode=9' } })
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    await waitFor(() => expect(writeFile).toHaveBeenCalledWith('MiSTer.ini', '[MiSTer]\nvideo_mode=9'))
  })

  it('deletes an entry after confirming', async () => {
    render(<FilesTab />)
    await waitFor(() => screen.getByText('MiSTer.ini'))
    fireEvent.click(screen.getByRole('button', { name: /delete MiSTer\.ini/i }))
    const confirm = await screen.findByRole('button', { name: /^delete$/i })
    expect(deleteFile).not.toHaveBeenCalled()
    fireEvent.click(confirm)
    await waitFor(() => expect(deleteFile).toHaveBeenCalledWith('MiSTer.ini', false))
  })
})
