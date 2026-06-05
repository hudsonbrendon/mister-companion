import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FilesTab } from './FilesTab'

const smbList = vi.fn()

beforeEach(() => {
  smbList.mockReset()
  smbList.mockResolvedValueOnce([
    { name: 'games', isDirectory: true, size: 0 },
    { name: 'MiSTer.ini', isDirectory: false, size: 2048 }
  ])
  ;(globalThis as any).window.api = { smbList }
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
})
