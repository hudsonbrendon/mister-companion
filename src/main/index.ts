import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from 'electron'
import { join } from 'node:path'
import { createHandlers, Session } from './ipc'
import { ProfileStore } from './store'
import { RestClient } from './mister/restClient'
import { WsClient } from './mister/wsClient'
import { applyWsMessage } from './mister/wsReducer'
import { IPC, emptyStatus, MisterStatus } from '@shared/types'

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
  const asset = (name: string): string =>
    app.isPackaged ? join(process.resourcesPath, name) : join(__dirname, '../../build', name)
  // macOS menu bar: a monochrome template (auto-tinted white/black to match the theme,
  // like the other menu-bar icons). Windows/Linux: the colored cat (a black template
  // would vanish on light taskbars).
  if (process.platform === 'darwin') {
    const img = nativeImage.createFromPath(asset('trayTemplate.png'))
    img.setTemplateImage(true)
    return img
  }
  return nativeImage.createFromPath(asset('tray.png'))
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
