import { SshClient } from './sshClient'

// Execute a MiSTer script file over SSH, streaming its output back chunk by chunk.
export async function runScriptCommand(
  ssh: Pick<SshClient, 'exec'>,
  command: string,
  onData: (chunk: string) => void
): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return ssh.exec(command, onData)
}
