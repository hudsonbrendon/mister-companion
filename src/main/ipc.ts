import type { IpcMain } from 'electron'
import { IPC, MisterProfile, emptyStatus } from '@shared/types'
import { RestClient } from './mister/restClient'
import { SshClient } from './mister/sshClient'
import { ProfileStore } from './store'
import { scanHosts, subnetHosts, browseMdns, mergeDevices } from './mister/discovery'
import { SCRIPT_CATALOG, runScript } from './mister/scripts'
import { RaWebClient } from './mister/raWeb'
import { SmbBrowser } from './mister/smb'

export interface Session {
  profileStore: ProfileStore
  rest: RestClient | null
  ssh: SshClient | null
  current: MisterProfile | null
  emit?: (channel: string, payload: unknown) => void
}

export function createHandlers(ipcMain: Pick<IpcMain, 'handle'>, session: Session): void {
  const h = (channel: string, fn: (...args: any[]) => any) =>
    ipcMain.handle(channel, (_e: unknown, ...args: any[]) => fn(...args))

  h(IPC.listProfiles, () => session.profileStore.list())
  h(IPC.saveProfile, (p: MisterProfile) => { session.profileStore.save(p); return session.profileStore.list() })
  h(IPC.deleteProfile, (id: string) => { session.profileStore.delete(id); return session.profileStore.list() })

  h(IPC.connect, (p: MisterProfile) => {
    session.current = p
    session.rest = new RestClient(p.host, p.restPort)
    session.ssh = p.sshUser
      ? new SshClient({ host: p.host, port: p.sshPort, username: p.sshUser, password: p.sshPassword })
      : null
    return true
  })
  h(IPC.disconnect, async () => { await session.ssh?.close(); session.rest = null; session.ssh = null; session.current = null; return true })

  h(IPC.getStatus, () => session.rest?.getStatus() ?? Promise.resolve(emptyStatus()))
  h(IPC.launchGame, (path: string) => {
    if (!session.rest) throw new Error('not connected')
    return session.rest.launchGame(path)
  })
  h(IPC.reboot, () => {
    if (!session.rest) throw new Error('not connected')
    return session.rest.reboot()
  })

  h(IPC.discover, async (localIp: string) => {
    const port = session.current?.restPort ?? 8182
    const [scan, mdns] = await Promise.all([
      scanHosts(subnetHosts(localIp), port, 800),
      browseMdns().catch(() => [])
    ])
    return mergeDevices(scan, mdns)
  })

  h(IPC.sshProbe, () => session.ssh?.probe())
  h(IPC.listScripts, () => SCRIPT_CATALOG)
  h(IPC.runScript, (id: string) => {
    if (!session.ssh) throw new Error('not connected over SSH')
    return runScript(session.ssh, id, (chunk) => session.emit?.(IPC.scriptOutput, { id, chunk }))
  })

  h(IPC.raSummary, (username: string, apiKey: string) =>
    new RaWebClient(username, apiKey).getSummary())

  h(IPC.smbList, (share: string, path: string) => {
    const p = session.current
    if (!p) throw new Error('not connected')
    return new SmbBrowser({ host: p.host, share, username: p.sshUser ?? 'root', password: p.sshPassword }).list(path)
  })
}
