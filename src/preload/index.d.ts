import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Book {
    id: string // file name
    fingerprint: string // identifies the book by its contents
    title: string
    size: number
    modified: number
  }

  interface LecternAPI {
    listBooks(): Promise<Book[]>
    readBook(id: string): Promise<Uint8Array>
    openLibraryFolder(): Promise<string>
    loadData(): Promise<StoredData>
    saveProgress(bookId: string, progress: BookProgress): Promise<void>
    saveSession(session: ReadingSession): Promise<void>
    dataLocation(): Promise<string> // where the data file is saved
    showDataFile(): Promise<void> // shows it in Finder
    exportData(format: DataExportFormat): Promise<string | null> // saved path, or null if cancelled
    clearData(scope: DataClearScope): Promise<StoredData> // the data that's left
    voiceModel(): Promise<{ url: string; available: boolean }>
    microphoneAccess(): Promise<'granted' | 'denied'>
    keepScreenOn(on: boolean): Promise<void>
    toggleFullscreen(): Promise<void>
    isFullscreen(): Promise<boolean>
    onFullscreenChange(callback: (isFullscreen: boolean) => void): () => void
  }

  interface Window {
    electron: ElectronAPI
    api: LecternAPI
  }
}
