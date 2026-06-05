import { describe, it, expect } from 'vitest'
import { SmbBrowser } from './smb'

// Fake @marsaud/smb2: readdir returns node-style Dirent-ish objects via callback.
function fakeSmb2() {
  return {
    readdir: (path: string, cb: (err: unknown, files: any[]) => void) => {
      expect(path).toBe('games\\SNES')
      cb(null, [
        { name: 'Chrono Trigger.sfc', isDirectory: () => false, size: 4194304 },
        { name: 'subfolder', isDirectory: () => true, size: 0 }
      ])
    },
    disconnect: () => {}
  }
}

describe('SmbBrowser', () => {
  it('lists a directory, normalizing slashes and sorting dirs first', async () => {
    const browser = new SmbBrowser(
      { host: '192.168.31.50', share: 'sdcard', username: 'root', password: '1' },
      () => fakeSmb2() as any
    )
    const entries = await browser.list('games/SNES')
    expect(entries[0]).toEqual({ name: 'subfolder', isDirectory: true, size: 0 })
    expect(entries[1].name).toBe('Chrono Trigger.sfc')
    expect(entries[1].isDirectory).toBe(false)
  })
})
