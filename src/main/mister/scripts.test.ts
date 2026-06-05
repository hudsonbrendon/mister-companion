import { describe, it, expect } from 'vitest'
import { SCRIPT_CATALOG, runScript } from './scripts'

describe('scripts', () => {
  it('catalog contains known MiSTer scripts with unique ids', () => {
    const ids = SCRIPT_CATALOG.map((s) => s.id)
    expect(ids).toContain('update_all')
    expect(ids).toContain('migrate_sd')
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('runScript streams output through the supplied SSH exec and returns the code', async () => {
    const chunks: string[] = []
    const fakeSsh = {
      exec: async (cmd: string, onData?: (c: string) => void) => {
        expect(cmd).toContain('update_all')
        onData?.('running...')
        return { stdout: 'running...', stderr: '', code: 0 }
      }
    }
    const result = await runScript(fakeSsh as any, 'update_all', (c) => chunks.push(c))
    expect(result.code).toBe(0)
    expect(chunks).toContain('running...')
  })

  it('runScript rejects an unknown script id', async () => {
    const fakeSsh = { exec: async () => ({ stdout: '', stderr: '', code: 0 }) }
    await expect(runScript(fakeSsh as any, 'nope', () => {})).rejects.toThrow(/unknown script/i)
  })
})
