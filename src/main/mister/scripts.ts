import { ScriptDef } from '@shared/types'
import { SshClient } from './sshClient'

export const SCRIPT_CATALOG: ScriptDef[] = [
  { id: 'update_all', label: 'Update All', description: 'Run the update_all script', command: '/media/fat/Scripts/update_all.sh' },
  { id: 'migrate_sd', label: 'Migrate SD', description: 'Reorganize the SD layout', command: '/media/fat/Scripts/migrate_sd.sh' },
  { id: 'cifs_mount', label: 'CIFS Mount', description: 'Mount network shares', command: '/media/fat/Scripts/cifs_mount.sh' },
  { id: 'auto_time', label: 'Auto Time', description: 'Sync the clock', command: '/media/fat/Scripts/auto_time.sh' },
  { id: 'ftp_save_sync', label: 'FTP Save Sync', description: 'Sync saves over FTP', command: '/media/fat/Scripts/ftp_save_sync.sh' }
]

export function findScript(id: string): ScriptDef | undefined {
  return SCRIPT_CATALOG.find((s) => s.id === id)
}

export async function runScript(
  ssh: Pick<SshClient, 'exec'>,
  id: string,
  onData: (chunk: string) => void
) {
  const script = findScript(id)
  if (!script) throw new Error(`unknown script: ${id}`)
  return ssh.exec(script.command, onData)
}
