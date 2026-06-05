import SMB2 from '@marsaud/smb2'
import { SmbEntry } from '@shared/types'

export interface SmbCreds {
  host: string
  share: string
  username: string
  password?: string
  domain?: string
}

interface Smb2Like {
  readdir(path: string, cb: (err: unknown, files: any[]) => void): void
  disconnect(): void
}

type Smb2Factory = (creds: SmbCreds) => Smb2Like

const defaultFactory: Smb2Factory = (creds) =>
  new SMB2({
    share: `\\\\${creds.host}\\${creds.share}`,
    domain: creds.domain ?? 'WORKGROUP',
    username: creds.username,
    password: creds.password ?? ''
  }) as unknown as Smb2Like

export class SmbBrowser {
  constructor(private creds: SmbCreds, private factory: Smb2Factory = defaultFactory) {}

  list(path: string): Promise<SmbEntry[]> {
    const smb = this.factory(this.creds)
    const smbPath = path.replace(/\//g, '\\').replace(/^\\+/, '')
    return new Promise((resolve, reject) => {
      smb.readdir(smbPath, (err, files) => {
        smb.disconnect()
        if (err) return reject(err)
        const entries: SmbEntry[] = files.map((f) => ({
          name: f.name,
          isDirectory: typeof f.isDirectory === 'function' ? f.isDirectory() : !!f.isDirectory,
          size: f.size ?? 0
        }))
        entries.sort((a, b) =>
          a.isDirectory === b.isDirectory ? a.name.localeCompare(b.name) : a.isDirectory ? -1 : 1
        )
        resolve(entries)
      })
    })
  }
}
