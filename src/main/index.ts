import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, shell, dialog } from 'electron'
import { join, basename } from 'node:path'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createHandlers, Session } from './ipc'
import { ProfileStore } from './store'
import { RestClient } from './mister/restClient'
import { WsClient } from './mister/wsClient'
import { applyWsMessage } from './mister/wsReducer'
import { isNewer } from './version'
import { IPC, emptyStatus, MisterStatus, UpdateInfo } from '@shared/types'

const RELEASES_API = 'https://api.github.com/repos/hudsonbrendon/mister-companion/releases/latest'

async function checkUpdate(): Promise<UpdateInfo> {
  const current = app.getVersion()
  try {
    const res = await fetch(RELEASES_API, { headers: { accept: 'application/vnd.github+json' } })
    if (!res.ok) return { current, latest: current, url: '', hasUpdate: false }
    const data = (await res.json()) as { tag_name?: string; html_url?: string }
    const latest = (data.tag_name ?? '').replace(/^v/, '')
    return {
      current,
      latest: latest || current,
      url: data.html_url ?? '',
      hasUpdate: latest.length > 0 && isNewer(latest, current)
    }
  } catch {
    return { current, latest: current, url: '', hasUpdate: false }
  }
}

const UPDATE_CASK = 'mister-companion'

// Homebrew lives outside the app's PATH; check the two standard locations.
function findBrew(): string | null {
  for (const p of ['/opt/homebrew/bin/brew', '/usr/local/bin/brew']) {
    if (existsSync(p)) return p
  }
  return null
}

// Run a command, streaming each output line to `onLine`. Resolves with the exit code.
function runStreamed(cmd: string, args: string[], onLine: (line: string) => void): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { env: process.env })
    const pipe = (buf: Buffer): void =>
      buf
        .toString()
        .split('\n')
        .map((l) => l.trimEnd())
        .filter((l) => l.length > 0)
        .forEach(onLine)
    child.stdout.on('data', pipe)
    child.stderr.on('data', pipe)
    child.on('close', (code) => resolve(code ?? 1))
    child.on('error', () => resolve(1))
  })
}

let win: BrowserWindow | null = null
let ws: WsClient | null = null
let tray: Tray | null = null
let isQuitting = false
let lastStatus: MisterStatus = emptyStatus()

const session: Session = {
  profileStore: new ProfileStore(),
  rest: null,
  ssh: null,
  current: null,
  emit: (channel, payload) => win?.webContents.send(channel, payload)
}

function createWindow(): void {
  win = new BrowserWindow({
    width: 1100,
    height: 720,
    icon: join(__dirname, '../../build/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })
  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Closing the window hides the app to the tray (Docker-style) instead of quitting.
  win.on('close', (e) => {
    if (isQuitting) return
    e.preventDefault()
    win?.hide()
    if (process.platform === 'darwin') app.dock?.hide()
  })
}

function showWindow(): void {
  if (!win) {
    createWindow()
  } else {
    win.show()
    win.focus()
  }
  if (process.platform === 'darwin') app.dock?.show()
}

function trayImage(): Electron.NativeImage {
  const path = app.isPackaged
    ? join(process.resourcesPath, 'tray.png')
    : join(__dirname, '../../build/tray.png')
  return nativeImage.createFromPath(path)
}

function updateTray(status: MisterStatus = lastStatus): void {
  lastStatus = status
  if (!tray) return
  const here = status.hostname ?? session.current?.name ?? 'MiSTer'
  const menu = Menu.buildFromTemplate([
    { label: status.online ? `● ${here}` : '○ Offline', enabled: false },
    ...(status.online
      ? [
          { label: `Core: ${status.core ?? '—'}`, enabled: false },
          ...(status.game ? [{ label: `Game: ${status.game}`, enabled: false }] : [])
        ]
      : []),
    { type: 'separator' as const },
    { label: 'Open MiSTer Companion', click: () => showWindow() },
    { label: 'Reboot MiSTer', enabled: !!session.rest, click: () => session.rest?.reboot() },
    { type: 'separator' as const },
    { label: 'Quit', click: () => { isQuitting = true; app.quit() } }
  ])
  tray.setContextMenu(menu)
  tray.setToolTip(status.online ? `MiSTer Companion — ${here} (${status.core ?? '—'})` : 'MiSTer Companion')
  // Glanceable core name next to the menu-bar icon on macOS.
  if (process.platform === 'darwin') tray.setTitle(status.online && status.core ? ` ${status.core}` : '')
}

function createTray(): void {
  tray = new Tray(trayImage())
  tray.on('double-click', () => showWindow())
  updateTray()
}

app.whenReady().then(() => {
  createHandlers(ipcMain, session)

  ipcMain.handle(IPC.checkUpdate, () => checkUpdate())
  ipcMain.handle(IPC.openExternal, (_e, url: string) => shell.openExternal(url))

  // Internal update: refresh the tap and upgrade the cask via Homebrew, streaming the
  // output live to the renderer. Works for brew-installed copies (the documented macOS
  // path); non-brew installs get `brew-not-found` and fall back to the download page.
  ipcMain.handle(IPC.selfUpdate, async () => {
    const brew = findBrew()
    if (!brew) return { ok: false, message: 'brew-not-found' }
    const emit = (line: string): void => session.emit?.(IPC.selfUpdateOutput, line)
    emit('$ brew update')
    await runStreamed(brew, ['update', '--quiet'], emit)
    emit(`$ brew upgrade --cask ${UPDATE_CASK}`)
    const code = await runStreamed(brew, ['upgrade', '--cask', UPDATE_CASK], emit)
    return { ok: code === 0, message: code === 0 ? 'ok' : 'upgrade-failed' }
  })

  ipcMain.handle(IPC.relaunchApp, () => {
    app.relaunch()
    isQuitting = true
    app.quit()
  })

  // Download a remote SD-card file to a local path the user picks. Returns the saved
  // path, or null if the user cancelled the save dialog.
  ipcMain.handle(IPC.downloadFile, async (_e, relPath: string, suggestedName: string) => {
    if (!session.ssh) throw new Error('not connected over SSH')
    const r = await dialog.showSaveDialog({ defaultPath: suggestedName })
    if (r.canceled || !r.filePath) return null
    await session.ssh.downloadFile(`/media/fat/${relPath}`, r.filePath)
    return r.filePath
  })

  // Upload one or more local files into the current remote directory. Returns the count
  // uploaded (0 if the user cancelled the open dialog).
  ipcMain.handle(IPC.uploadFiles, async (_e, relDir: string) => {
    if (!session.ssh) throw new Error('not connected over SSH')
    const r = await dialog.showOpenDialog({ properties: ['openFile', 'multiSelections'] })
    if (r.canceled || r.filePaths.length === 0) return 0
    for (const fp of r.filePaths) {
      await session.ssh.uploadFile(fp, `/media/fat/${relDir ? relDir + '/' : ''}${basename(fp)}`)
    }
    return r.filePaths.length
  })

  // Backup the saves + savestates folders as a single .tar.gz downloaded locally.
  // Read-only on the device (tars to /tmp, downloads, then removes the temp tarball).
  ipcMain.handle(IPC.backupSaves, async () => {
    if (!session.ssh) throw new Error('not connected over SSH')
    const r = await dialog.showSaveDialog({ defaultPath: 'mister-saves.tar.gz' })
    if (r.canceled || !r.filePath) return null
    await session.ssh.exec(
      'tar czf /tmp/mc-saves.tar.gz -C /media/fat saves savestates 2>/dev/null || true'
    )
    await session.ssh.downloadFile('/tmp/mc-saves.tar.gz', r.filePath)
    await session.ssh.exec('rm -f /tmp/mc-saves.tar.gz')
    return r.filePath
  })

  // When a profile connects, start a WS feed that pushes live status to the renderer
  // and refreshes the tray menu.
  ipcMain.handle('mister:startStatusFeed', async () => {
    ws?.stop()
    if (!session.current) return false
    const rest = new RestClient(session.current.host, session.current.restPort)
    let status = await rest.getStatus()
    session.emit?.(IPC.statusUpdate, status)
    updateTray(status)
    ws = new WsClient(session.current.host, session.current.restPort)
    ws.listen((raw) => {
      if (raw.startsWith('indexStatus:')) {
        const p = raw.slice('indexStatus:'.length).split(',')
        session.emit?.(IPC.indexStatus, {
          exists: p[0] === 'y', indexing: p[1] === 'y',
          total: Number(p[2]) || 0, current: Number(p[3]) || 0, desc: (p[4] ?? '').trim()
        })
        return
      }
      status = applyWsMessage(raw, status)
      session.emit?.(IPC.statusUpdate, status)
      updateTray(status)
    })
    return true
  })

  createTray()
  createWindow()
  app.on('activate', () => showWindow())
})

app.on('before-quit', () => { isQuitting = true })

// Keep running in the tray when all windows are closed (do not quit).
app.on('window-all-closed', () => {})
