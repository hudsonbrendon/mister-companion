import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { ScriptsTab } from './ScriptsTab'

const runScript = vi.fn().mockResolvedValue({ code: 0 })
let pushOutput: (o: any) => void = () => {}

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

beforeEach(() => {
  runScript.mockClear()
  ;(globalThis as any).window.api = {
    listScripts: vi.fn().mockResolvedValue([
      { id: 'update_all', label: 'Update All', description: 'Run the update_all script', command: 'c' }
    ]),
    runScript,
    onScriptOutput: (cb: (o: any) => void) => {
      pushOutput = cb
      return () => {}
    }
  }
})

describe('ScriptsTab', () => {
  it('lists scripts, runs one, and streams output', async () => {
    render(<ScriptsTab />)
    await waitFor(() => screen.getByRole('button', { name: /run update all/i }))
    fireEvent.click(screen.getByRole('button', { name: /run update all/i }))
    expect(runScript).toHaveBeenCalledWith('update_all')
    await act(async () => pushOutput({ id: 'update_all', chunk: 'working...' }))
    expect(screen.getByText(/working\.\.\./)).toBeInTheDocument()
  })
})
