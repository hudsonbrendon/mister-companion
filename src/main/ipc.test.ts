import { describe, it, expect, vi } from 'vitest'
import { createHandlers } from './ipc'
import { IPC, emptyStatus } from '@shared/types'

describe('createHandlers', () => {
  it('registers a handler per request channel and getStatus calls the rest client', async () => {
    const handlers = new Map<string, (...a: any[]) => any>()
    const ipcMain = { handle: (ch: string, fn: any) => handlers.set(ch, fn) } as any

    const fakeRest = { getStatus: vi.fn().mockResolvedValue({ ...emptyStatus(), online: true }) }
    const session = {
      rest: fakeRest,
      ssh: null,
      profileStore: { list: () => [], save: () => {}, delete: () => {} }
    } as any

    createHandlers(ipcMain, session)
    expect(handlers.has(IPC.getStatus)).toBe(true)
    expect(handlers.has(IPC.listProfiles)).toBe(true)

    const status = await handlers.get(IPC.getStatus)!({})
    expect(status.online).toBe(true)
    expect(fakeRest.getStatus).toHaveBeenCalled()
  })

  it('getStatus resolves to a full offline status shape when session.rest is null', async () => {
    const handlers = new Map<string, (...a: any[]) => any>()
    const ipcMain = { handle: (ch: string, fn: any) => handlers.set(ch, fn) } as any

    const session = {
      rest: null,
      ssh: null,
      profileStore: { list: () => [], save: () => {}, delete: () => {} }
    } as any

    createHandlers(ipcMain, session)

    const status = await handlers.get(IPC.getStatus)!({})
    expect(status.online).toBe(false)
    expect(Array.isArray(status.ips)).toBe(true)
    expect(status.ips).toEqual([])
  })
})
