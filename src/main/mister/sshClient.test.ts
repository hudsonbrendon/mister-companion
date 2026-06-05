import { describe, it, expect } from 'vitest'
import { EventEmitter } from 'node:events'
import { SshClient } from './sshClient'

// Minimal fake of ssh2.Client: connect() emits 'ready', exec() streams canned stdout.
function fakeClientFactory(stdout: string) {
  return () => {
    const client = new EventEmitter() as any
    client.connect = () => setTimeout(() => client.emit('ready'), 0)
    client.exec = (_cmd: string, cb: (err: unknown, stream: any) => void) => {
      const stream = new EventEmitter() as any
      stream.stderr = new EventEmitter()
      cb(null, stream)
      setTimeout(() => { stream.emit('data', Buffer.from(stdout)); stream.emit('close', 0) }, 0)
    }
    client.end = () => client.emit('close')
    return client
  }
}

// Fake whose sftp().readdir() returns canned entries.
function fakeSftpFactory(entries: { filename: string; dir: boolean; size: number }[]) {
  return () => {
    const client = new EventEmitter() as any
    client.connect = () => setTimeout(() => client.emit('ready'), 0)
    client.sftp = (cb: (err: unknown, sftp: any) => void) => {
      cb(null, {
        readdir: (_path: string, rcb: (e: unknown, list: any[]) => void) => {
          rcb(null, entries.map((x) => ({
            filename: x.filename,
            attrs: { size: x.size, isDirectory: () => x.dir }
          })))
        },
        readFile: (_p: string, rcb: (e: unknown, data: Buffer) => void) => rcb(null, Buffer.from('hello=1')),
        writeFile: (_p: string, _c: string, wcb: (e: unknown) => void) => wcb(null),
        unlink: (_p: string, ucb: (e: unknown) => void) => ucb(null)
      })
    }
    client.end = () => client.emit('close')
    return client
  }
}

describe('SshClient', () => {
  it('runs a command and resolves with stdout', async () => {
    const ssh = new SshClient(
      { host: '127.0.0.1', port: 22, username: 'root', password: '1' },
      fakeClientFactory('hello world')
    )
    const out = await ssh.exec('echo hi')
    expect(out.stdout).toBe('hello world')
    expect(out.code).toBe(0)
    await ssh.close()
  })

  it('probe() parses telemetry from the probe command output', async () => {
    const ssh = new SshClient(
      { host: '127.0.0.1', port: 22, username: 'root', password: '1' },
      fakeClientFactory('memfree=512\ntemp=40000')
    )
    const t = await ssh.probe()
    expect(t.memFreeKb).toBe(512)
    expect(t.temperatureC).toBeCloseTo(40)
    await ssh.close()
  })

  it('listDir() returns SFTP entries with directories sorted first', async () => {
    const ssh = new SshClient(
      { host: '127.0.0.1', port: 22, username: 'root', password: '1' },
      fakeSftpFactory([
        { filename: 'MiSTer.ini', dir: false, size: 2048 },
        { filename: 'Scripts', dir: true, size: 0 }
      ])
    )
    const entries = await ssh.listDir('/media/fat')
    expect(entries[0]).toEqual({ name: 'Scripts', isDirectory: true, size: 0 })
    expect(entries[1]).toEqual({ name: 'MiSTer.ini', isDirectory: false, size: 2048 })
    await ssh.close()
  })

  it('readFile/writeFile round-trip and deleteEntry work over SFTP', async () => {
    const ssh = new SshClient(
      { host: '127.0.0.1', port: 22, username: 'root', password: '1' },
      fakeSftpFactory([])
    )
    expect(await ssh.readFile('/media/fat/MiSTer.ini')).toBe('hello=1')
    await expect(ssh.writeFile('/media/fat/MiSTer.ini', 'x=2')).resolves.toBeUndefined()
    await expect(ssh.deleteEntry('/media/fat/x.txt', false)).resolves.toBeUndefined()
    await ssh.close()
  })
})
