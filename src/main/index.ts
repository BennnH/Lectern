import { app, shell, BrowserWindow, ipcMain, powerSaveBlocker } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { registerLibraryHandlers } from './library'
import { registerStoreHandlers } from './store'

import { registerVoiceHandlers, registerVoiceScheme } from './voice'
import { lockDownSession } from './security'

// The lectern:// address for the voice model has to be registered before the app is ready
registerVoiceScheme()

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 720,
    minHeight: 520,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0a0a0a',
    // macOS: hide the title bar but keep the traffic lights floating over our UI
    ...(process.platform === 'darwin' ? { titleBarStyle: 'hiddenInset' as const } : {}),
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // Tell the UI when full screen changes (including via the green button)
  mainWindow.on('enter-full-screen', () => {
    mainWindow.webContents.send('window:fullscreen-changed', true)
  })
  mainWindow.on('leave-full-screen', () => {
    mainWindow.webContents.send('window:fullscreen-changed', false)
  })

  // If the page reloads mid-book, let the screen sleep normally again
  mainWindow.webContents.on('did-start-loading', () => keepScreenOn(false))

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Stops the display going to sleep while you read (null when the screen can sleep)
let screenBlocker: number | null = null

function keepScreenOn(on: boolean): void {
  if (on && screenBlocker === null) {
    screenBlocker = powerSaveBlocker.start('prevent-display-sleep')
  } else if (!on && screenBlocker !== null) {
    powerSaveBlocker.stop(screenBlocker)
    screenBlocker = null
  }
}

function registerWindowHandlers(): void {
  ipcMain.handle('window:keep-screen-on', (_event, on: boolean) => keepScreenOn(on))
  ipcMain.handle('window:toggle-fullscreen', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) win.setFullScreen(!win.isFullScreen())
  })
  ipcMain.handle('window:is-fullscreen', (event) => {
    return BrowserWindow.fromWebContents(event.sender)?.isFullScreen() ?? false
  })
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('info.benhardy.lectern')

  // In development the Dock shows Electron's own icon; show Lectern's instead.
  // (The built app gets its icon from build/icon.icns, so it doesn't need this.)
  if (is.dev && process.platform === 'darwin') app.dock?.setIcon(icon)

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  lockDownSession(is.dev ? process.env['ELECTRON_RENDERER_URL'] : undefined)
  registerLibraryHandlers()
  registerStoreHandlers()
  registerVoiceHandlers()
  registerWindowHandlers()
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
