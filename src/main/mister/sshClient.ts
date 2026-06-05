import { Client } from 'ssh2'
import { SshTelemetry, SmbEntry } from '@shared/types'
import { PROBE_COMMAND, parseSshProbe } from './sshProbe'

export interface SshCreds {
  host: string
  port: number
  username: string
  password?: string
}

export interface ExecResult {
  stdout: string
  stderr: string
  code: number | null
}

type ClientFactory = () => Client

export class SshClient {
  private client: Client | null = null
  constructor(
    private creds: SshCreds,
    private factory: ClientFactory = () => new Client()
  ) {}

  private connect(): Promise<Client> {
    if (this.client) return Promise.resolve(this.client)
    return new Promise((resolve, reject) => {
      const c = this.factory()
      c.on('ready', () => { this.client = c; resolve(c) })
      c.on('error', (err) => { c.end(); reject(err) })
      c.connect({
        host: this.creds.host,
        port: this.creds.port,
        username: this.creds.username,
        password: this.creds.password
      })
    })
  }

  async exec(command: string, onData?: (chunk: string) => void): Promise<ExecResult> {
    const c = await this.connect()
    return new Promise((resolve, reject) => {
      c.exec(command, (err, stream) => {
        if (err) return reject(err)
        stream.on('error', reject)
        let stdout = ''
        let stderr = ''
        stream.on('data', (d: Buffer) => {
          const s = d.toString()
          stdout += s
          onData?.(s)
        })
        stream.stderr.on('data', (d: Buffer) => (stderr += d.toString()))
        stream.on('close', (code: number | null) => resolve({ stdout, stderr, code }))
      })
    })
  }

  async probe(): Promise<SshTelemetry> {
    const { stdout } = await this.exec(PROBE_COMMAND)
    return parseSshProbe(stdout)
  }

  // List a remote directory over SFTP (modern SSH auth — works where the @marsaud/smb2
  // NTLMv1 client is rejected by the MiSTer's NTLMv2-only Samba). Directories sort first.
  async listDir(path: string): Promise<SmbEntry[]> {
    const c = await this.connect()
    return new Promise((resolve, reject) => {
      c.sftp((err, sftp) => {
        if (err) return reject(err)
        sftp.readdir(path, (e, list) => {
          if (e) return reject(e)
          const entries: SmbEntry[] = list.map((f) => ({
            name: f.filename,
            isDirectory: f.attrs.isDirectory(),
            size: f.attrs.size ?? 0
          }))
          entries.sort((a, b) =>
            a.isDirectory === b.isDirectory ? a.name.localeCompare(b.name) : a.isDirectory ? -1 : 1
          )
          resolve(entries)
        })
      })
    })
  }

  // Read a remote text file over SFTP.
  async readFile(path: string): Promise<string> {
    const c = await this.connect()
    return new Promise((resolve, reject) => {
      c.sftp((err, sftp) => {
        if (err) return reject(err)
        sftp.readFile(path, (e, data) => (e ? reject(e) : resolve(data.toString('utf8'))))
      })
    })
  }

  // Overwrite a remote file with the given text.
  async writeFile(path: string, content: string): Promise<void> {
    const c = await this.connect()
    return new Promise((resolve, reject) => {
      c.sftp((err, sftp) => {
        if (err) return reject(err)
        sftp.writeFile(path, content, (e) => (e ? reject(e) : resolve()))
      })
    })
  }

  // Delete a remote file or (empty/non-empty) directory over SFTP.
  async deleteEntry(path: string, isDirectory: boolean): Promise<void> {
    if (isDirectory) {
      // rm -rf is the only reliable recursive delete; SFTP rmdir fails on non-empty dirs.
      await this.exec(`rm -rf "${path.replace(/"/g, '\\"')}"`)
      return
    }
    const c = await this.connect()
    return new Promise((resolve, reject) => {
      c.sftp((err, sftp) => {
        if (err) return reject(err)
        sftp.unlink(path, (e) => (e ? reject(e) : resolve()))
      })
    })
  }

  async close(): Promise<void> {
    this.client?.end()
    this.client = null
  }
}
