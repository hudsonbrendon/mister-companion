import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'node:path'
import { createHandlers, Session } from './ipc'
import { ProfileStore } from './store'
import { RestClient } from './mister/restClient'
import { WsClient } from './mister/wsClient'
import { applyWsMessage } from './mister/wsReducer'
import { IPC, emptyStatus } from '@shared/types'

let win: BrowserWindow | null = null
let ws: WsClient | null = null

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
}

app.whenReady().then(() => {
  createHandlers(ipcMain, session)

  // When a profile connects, start a WS feed that pushes live status to the renderer.
  ipcMain.handle('mister:startStatusFeed', async () => {
    ws?.stop()
    if (!session.current) return false
    let status = { ...emptyStatus(), online: true }
    const rest = new RestClient(session.current.host, session.current.restPort)
    status = await rest.getStatus()
    session.emit?.(IPC.statusUpdate, status)
    ws = new WsClient(session.current.host, session.current.restPort)
    ws.listen((raw) => {
      status = applyWsMessage(raw, status)
      session.emit?.(IPC.statusUpdate, status)
    })
    return true
  })

  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => {
  ws?.stop()
  if (process.platform !== 'darwin') app.quit()
})
