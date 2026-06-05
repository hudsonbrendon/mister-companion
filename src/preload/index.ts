import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '@shared/types'

const api = {
  listProfiles: () => ipcRenderer.invoke(IPC.listProfiles),
  saveProfile: (p: unknown) => ipcRenderer.invoke(IPC.saveProfile, p),
  deleteProfile: (id: string) => ipcRenderer.invoke(IPC.deleteProfile, id),
  connect: (p: unknown) => ipcRenderer.invoke(IPC.connect, p),
  disconnect: () => ipcRenderer.invoke(IPC.disconnect),
  getStatus: () => ipcRenderer.invoke(IPC.getStatus),
  launchGame: (path: string) => ipcRenderer.invoke(IPC.launchGame, path),
  reboot: () => ipcRenderer.invoke(IPC.reboot),
  discover: (localIp: string) => ipcRenderer.invoke(IPC.discover, localIp),
  sshProbe: () => ipcRenderer.invoke(IPC.sshProbe),
  listScripts: () => ipcRenderer.invoke(IPC.listScripts),
  runScript: (id: string) => ipcRenderer.invoke(IPC.runScript, id),
  raSummary: (u: string, k: string) => ipcRenderer.invoke(IPC.raSummary, u, k),
  smbList: (share: string, path: string) => ipcRenderer.invoke(IPC.smbList, share, path),
  startStatusFeed: () => ipcRenderer.invoke('mister:startStatusFeed'),
  onStatusUpdate: (cb: (s: unknown) => void) => {
    const listener = (_e: unknown, s: unknown) => cb(s)
    ipcRenderer.on(IPC.statusUpdate, listener)
    return () => ipcRenderer.removeListener(IPC.statusUpdate, listener)
  },
  onScriptOutput: (cb: (o: unknown) => void) => {
    const listener = (_e: unknown, o: unknown) => cb(o)
    ipcRenderer.on(IPC.scriptOutput, listener)
    return () => ipcRenderer.removeListener(IPC.scriptOutput, listener)
  },
  searchSystems: () => ipcRenderer.invoke(IPC.searchSystems),
  searchGames: (query: string, system: string) => ipcRenderer.invoke(IPC.searchGames, query, system),
  generateIndex: () => ipcRenderer.invoke(IPC.generateIndex),
  sendKey: (key: string) => ipcRenderer.invoke(IPC.sendKey, key),
  raRecent: (u: string, k: string, minutes: number) => ipcRenderer.invoke(IPC.raRecent, u, k, minutes),
  raGameProgress: (u: string, k: string, gameId: number) => ipcRenderer.invoke(IPC.raGameProgress, u, k, gameId),
  checkUpdate: () => ipcRenderer.invoke(IPC.checkUpdate),
  openExternal: (url: string) => ipcRenderer.invoke(IPC.openExternal, url),
  getWallpapers: () => ipcRenderer.invoke(IPC.getWallpapers),
  setWallpaper: (f: string) => ipcRenderer.invoke(IPC.setWallpaper, f),
  unsetWallpaper: () => ipcRenderer.invoke(IPC.unsetWallpaper),
  getScreenshots: () => ipcRenderer.invoke(IPC.getScreenshots),
  takeScreenshot: () => ipcRenderer.invoke(IPC.takeScreenshot),
  deleteScreenshot: (f: string) => ipcRenderer.invoke(IPC.deleteScreenshot, f),
  readFile: (path: string) => ipcRenderer.invoke(IPC.readFile, path),
  writeFile: (path: string, content: string) => ipcRenderer.invoke(IPC.writeFile, path, content),
  deleteFile: (path: string, isDir: boolean) => ipcRenderer.invoke(IPC.deleteFile, path, isDir),
  onIndexStatus: (cb: (s: unknown) => void) => {
    const listener = (_e: unknown, s: unknown) => cb(s)
    ipcRenderer.on(IPC.indexStatus, listener)
    return () => ipcRenderer.removeListener(IPC.indexStatus, listener)
  }
}

contextBridge.exposeInMainWorld('api', api)
export type Api = typeof api
