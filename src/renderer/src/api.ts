import type { MisterStatus, MisterProfile, ScriptDef, RaSummary, SmbEntry, DiscoveredDevice, SshTelemetry } from '@shared/types'

export interface RendererApi {
  listProfiles(): Promise<MisterProfile[]>
  saveProfile(p: MisterProfile): Promise<MisterProfile[]>
  deleteProfile(id: string): Promise<MisterProfile[]>
  connect(p: MisterProfile): Promise<boolean>
  disconnect(): Promise<boolean>
  getStatus(): Promise<MisterStatus>
  launchGame(path: string): Promise<void>
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
}

// Forward every access to the live window.api so tests can swap window.api per-test
// and the Electron preload's bridge is read at call time (not captured at module load).
export const api: RendererApi = new Proxy({} as RendererApi, {
  get(_target, prop) {
    const live = (globalThis as unknown as { window: { api: RendererApi } }).window.api
    return live[prop as keyof RendererApi]
  }
})
