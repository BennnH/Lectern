import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// The functions the UI is allowed to call in the main process
const api = {
  listBooks: () => ipcRenderer.invoke('library:list'),
  readBook: (id: string) => ipcRenderer.invoke('library:read', id),
  openLibraryFolder: () => ipcRenderer.invoke('library:open-folder'),

  loadData: () => ipcRenderer.invoke('data:load'),
  saveProgress: (bookId: string, progress: BookProgress) =>
    ipcRenderer.invoke('data:save-progress', bookId, progress),
  saveSession: (session: ReadingSession) => ipcRenderer.invoke('data:save-session', session),

  voiceModel: () => ipcRenderer.invoke('voice:model'),
  microphoneAccess: () => ipcRenderer.invoke('voice:microphone-access'),

  keepScreenOn: (on: boolean) => ipcRenderer.invoke('window:keep-screen-on', on),
  toggleFullscreen: () => ipcRenderer.invoke('window:toggle-fullscreen'),
  isFullscreen: () => ipcRenderer.invoke('window:is-fullscreen'),
  // Calls back whenever full screen changes; returns a function that stops listening
  onFullscreenChange: (callback: (isFullscreen: boolean) => void) => {
    const listener = (_event: IpcRendererEvent, value: boolean): void => callback(value)
    ipcRenderer.on('window:fullscreen-changed', listener)
    return () => {
      ipcRenderer.removeListener('window:fullscreen-changed', listener)
    }
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
