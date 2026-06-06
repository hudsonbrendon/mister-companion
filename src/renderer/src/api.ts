import type { MisterStatus, MisterProfile, ScriptDef, RaSummary, SmbEntry, DiscoveredDevice, SshTelemetry, GameResult, GameSystem, IndexStatus, RaRecentUnlock, RaGameDetail, UpdateInfo, WallpapersData, Screenshot, InisData } from '@shared/types'

export interface RendererApi {
  listProfiles(): Promise<MisterProfile[]>
  saveProfile(p: MisterProfile): Promise<MisterProfile[]>
  deleteProfile(id: string): Promise<MisterProfile[]>
  connect(p: MisterProfile): Promise<boolean>
  disconnect(): Promise<boolean>
  getStatus(): Promise<MisterStatus>
  launchGame(path: string): Promise<void>
  backToMenu(): Promise<void>
  reboot(): Promise<void>
  discover(localIp: string): Promise<DiscoveredDevice[]>
  sshProbe(): Promise<SshTelemetry>
  listScripts(): Promise<ScriptDef[]>
  runScript(id: string): Promise<{ code: number | null }>
  raSummary(username: string, apiKey: string): Promise<RaSummary>
  smbList(share: string, path: string): Promise<SmbEntry[]>
  startStatusFeed(): Promise<boolean>
  onStatusUpdate(cb: (s: MisterStatus) => void): () => void
  onScriptOutput(cb: (o: { id: string; chunk: string }) => void): () => void
  searchSystems(): Promise<GameSystem[]>
  listSystems(): Promise<GameSystem[]>
  listInis(): Promise<InisData>
  readIni(id: number): Promise<Record<string, string>>
  writeIni(id: number, values: Record<string, string>): Promise<void>
  setActiveIni(id: number): Promise<void>
  searchGames(query: string, system: string): Promise<GameResult[]>
  generateIndex(): Promise<void>
  onIndexStatus(cb: (s: IndexStatus) => void): () => void
  sendKey(key: string): Promise<void>
  raRecent(username: string, apiKey: string, minutes: number): Promise<RaRecentUnlock[]>
  raGameProgress(username: string, apiKey: string, gameId: number): Promise<RaGameDetail>
  checkUpdate(): Promise<UpdateInfo>
  openExternal(url: string): Promise<void>
  selfUpdate(): Promise<{ ok: boolean; message: string }>
  relaunchApp(): Promise<void>
  onSelfUpdateOutput(cb: (line: string) => void): () => void
  getWallpapers(): Promise<WallpapersData>
  setWallpaper(filename: string): Promise<void>
  unsetWallpaper(): Promise<void>
  getScreenshots(): Promise<Screenshot[]>
  takeScreenshot(): Promise<void>
  deleteScreenshot(filename: string): Promise<void>
  readFile(path: string): Promise<string>
  writeFile(path: string, content: string): Promise<void>
  deleteFile(path: string, isDir: boolean): Promise<void>
  downloadFile(path: string, suggestedName: string): Promise<string | null>
  uploadFiles(dir: string): Promise<number>
  backupSaves(): Promise<string | null>
}

// Forward every access to the live window.api so tests can swap window.api per-test
// and the Electron preload's bridge is read at call time (not captured at module load).
export const api: RendererApi = new Proxy({} as RendererApi, {
  get(_target, prop) {
    const live = (globalThis as unknown as { window: { api: RendererApi } }).window.api
    return live[prop as keyof RendererApi]
  }
})
