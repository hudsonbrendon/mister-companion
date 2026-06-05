import { Client } from 'ssh2'
import { SshTelemetry } from '@shared/types'
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

  async close(): Promise<void> {
    this.client?.end()
    this.client = null
  }
}
