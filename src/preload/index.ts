import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// The functions the UI is allowed to call in the main process
const api = {
  listBooks: () => ipcRenderer.invoke('library:list'),
  readBook: (id: string) => ipcRenderer.invoke('library:read', id),
  openLibraryFolder: () => ipcRenderer.invoke('library:open-folder')
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
