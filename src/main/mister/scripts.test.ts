import { describe, it, expect } from 'vitest'
import { runScriptCommand } from './scripts'

describe('scripts', () => {
  it('runScriptCommand streams output through the supplied SSH exec and returns the code', async () => {
    const chunks: string[] = []
    const fakeSsh = {
      exec: async (cmd: string, onData?: (c: string) => void) => {
        expect(cmd).toBe('/media/fat/Scripts/update_all.sh')
        onData?.('running...')
        return { stdout: 'running...', stderr: '', code: 0 }
      }
    }
    const result = await runScriptCommand(
      fakeSsh as never,
      '/media/fat/Scripts/update_all.sh',
      (c) => chunks.push(c)
    )
    expect(result.code).toBe(0)
    expect(chunks).toContain('running...')
  })
})
