import type { IpcMain } from 'electron'
import { IPC, MisterProfile, ScriptDef, emptyStatus } from '@shared/types'
import { RestClient } from './mister/restClient'
import { SshClient } from './mister/sshClient'
import { ProfileStore } from './store'
import { scanHosts, subnetHosts, browseMdns, mergeDevices } from './mister/discovery'
import { runScriptCommand } from './mister/scripts'
import { RaWebClient } from './mister/raWeb'
import { localIpv4 } from './net'

export interface Session {
  profileStore: ProfileStore
  rest: RestClient | null
  ssh: SshClient | null
  current: MisterProfile | null
  scripts?: ScriptDef[]
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
  h(IPC.backToMenu, () => {
    if (!session.rest) throw new Error('not connected')
    return session.rest.backToMenu()
  })

  h(IPC.discover, async (localIp: string) => {
    const port = session.current?.restPort ?? 8182
    // Prefer the real LAN IP detected in the main process; the renderer's value is
    // unreliable in a packaged app (window.location.hostname is empty over file://).
    const local = localIpv4() ?? localIp
    const [scan, mdns] = await Promise.all([
      scanHosts(subnetHosts(local), port, 800),
      browseMdns().catch(() => [])
    ])
    return mergeDevices(scan, mdns)
  })

  h(IPC.sshProbe, () => session.ssh?.probe())
  h(IPC.listScripts, async () => {
    const scripts = (await session.rest?.listScripts()) ?? []
    session.scripts = scripts
    return scripts
  })
  h(IPC.runScript, (id: string) => {
    if (!session.ssh) throw new Error('not connected over SSH')
    const script = session.scripts?.find((s) => s.id === id)
    if (!script) throw new Error(`unknown script: ${id}`)
    return runScriptCommand(session.ssh, script.command, (chunk) =>
      session.emit?.(IPC.scriptOutput, { id, chunk })
    )
  })

  h(IPC.raSummary, (username: string, apiKey: string) =>
    new RaWebClient(username, apiKey).getSummary())
  h(IPC.raRecent, (username: string, apiKey: string, minutes: number) =>
    new RaWebClient(username, apiKey).getRecent(minutes))
  h(IPC.raGameProgress, (username: string, apiKey: string, gameId: number) =>
    new RaWebClient(username, apiKey).getGameProgress(gameId))

  h(IPC.searchSystems, () => session.rest?.searchSystems() ?? Promise.resolve([]))
  h(IPC.listSystems, () => session.rest?.listSystems() ?? Promise.resolve([]))
  h(IPC.listInis, () => session.rest?.listInis() ?? Promise.resolve({ active: 0, inis: [] }))
  h(IPC.readIni, (id: number) => session.rest?.readIni(id) ?? Promise.resolve({}))
  h(IPC.writeIni, (id: number, values: Record<string, string>) => {
    if (!session.rest) throw new Error('not connected')
    return session.rest.writeIni(id, values)
  })
  h(IPC.setActiveIni, (id: number) => {
    if (!session.rest) throw new Error('not connected')
    return session.rest.setActiveIni(id)
  })
  h(IPC.musicStatus, () =>
    session.rest?.getMusicStatus() ??
    Promise.resolve({ running: false, playing: false, playback: '', playlist: '', track: '' }))
  h(IPC.musicPlaylists, () => session.rest?.getMusicPlaylists() ?? Promise.resolve([]))
  h(IPC.musicPlay, () => { if (!session.rest) throw new Error('not connected'); return session.rest.musicPlay() })
  h(IPC.musicStop, () => { if (!session.rest) throw new Error('not connected'); return session.rest.musicStop() })
  h(IPC.musicNext, () => { if (!session.rest) throw new Error('not connected'); return session.rest.musicNext() })
  h(IPC.musicPlayback, (type: string) => {
    if (!session.rest) throw new Error('not connected')
    return session.rest.setMusicPlayback(type)
  })
  h(IPC.musicSetPlaylist, (name: string) => {
    if (!session.rest) throw new Error('not connected')
    return session.rest.setMusicPlaylist(name)
  })
  h(IPC.searchGames, (query: string, system: string) =>
    session.rest?.searchGames(query, system) ?? Promise.resolve([]))
  h(IPC.generateIndex, () => {
    if (!session.rest) throw new Error('not connected')
    return session.rest.generateIndex()
  })
  h(IPC.sendKey, (key: string) => {
    if (!session.rest) throw new Error('not connected')
    return session.rest.sendKey(key)
  })

  h(IPC.getWallpapers, () =>
    session.rest?.getWallpapers() ?? Promise.resolve({ active: '', backgroundMode: 0, wallpapers: [] }))
  h(IPC.setWallpaper, (filename: string) => {
    if (!session.rest) throw new Error('not connected')
    return session.rest.setWallpaper(filename)
  })
  h(IPC.unsetWallpaper, () => {
    if (!session.rest) throw new Error('not connected')
    return session.rest.unsetWallpaper()
  })
  h(IPC.getScreenshots, () => session.rest?.getScreenshots() ?? Promise.resolve([]))
  h(IPC.takeScreenshot, () => {
    if (!session.rest) throw new Error('not connected')
    return session.rest.takeScreenshot()
  })
  h(IPC.deleteScreenshot, (filename: string) => {
    if (!session.rest) throw new Error('not connected')
    return session.rest.deleteScreenshot(filename)
  })

  // Browse the SD card over SFTP (the MiSTer's Samba is NTLMv2-only, which the bundled
  // SMB client can't speak; SSH/SFTP uses modern auth and shares the same credentials).
  // The first arg (legacy share name) is ignored; paths are relative to /media/fat.
  h(IPC.smbList, (_share: string, path: string) => {
    if (!session.ssh) throw new Error('not connected over SSH')
    const full = path ? `/media/fat/${path}` : '/media/fat'
    return session.ssh.listDir(full)
  })
  h(IPC.readFile, (path: string) => {
    if (!session.ssh) throw new Error('not connected over SSH')
    return session.ssh.readFile(`/media/fat/${path}`)
  })
  h(IPC.writeFile, (path: string, content: string) => {
    if (!session.ssh) throw new Error('not connected over SSH')
    return session.ssh.writeFile(`/media/fat/${path}`, content)
  })
  h(IPC.deleteFile, (path: string, isDir: boolean) => {
    if (!session.ssh) throw new Error('not connected over SSH')
    return session.ssh.deleteEntry(`/media/fat/${path}`, isDir)
  })
}
