import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Book {
    id: string
    title: string
    size: number
    modified: number
  }

  interface LecternAPI {
    listBooks(): Promise<Book[]>
    readBook(id: string): Promise<Uint8Array>
    openLibraryFolder(): Promise<string>
    toggleFullscreen(): Promise<void>
    isFullscreen(): Promise<boolean>
    onFullscreenChange(callback: (isFullscreen: boolean) => void): () => void
  }

  interface Window {
    electron: ElectronAPI
    api: LecternAPI
  }
}
