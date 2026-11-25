declare global {
  interface Book {
    id: string // file name
    fingerprint: string // identifies the book by its contents
    title: string
    size: number
    modified: number
  }

  interface LecternAPI {
    platform: string // 'darwin' on a Mac
    appVersion(): Promise<string> // e.g. '1.0.0'
    listBooks(): Promise<Book[]>
    readBook(id: string): Promise<Uint8Array>
    openLibraryFolder(): Promise<string>
    libraryFolder(): Promise<LibraryFolder>
    chooseLibraryFolder(): Promise<LibraryFolder | null> // null if you cancel
    useDefaultLibraryFolder(): Promise<LibraryFolder>
    addBooks(files: File[]): Promise<AddBooksResult>
    loadData(): Promise<StoredData>
    saveProgress(bookId: string, progress: BookProgress): Promise<void>
    saveSession(session: ReadingSession): Promise<void>
    dataLocation(): Promise<string> // where the data file is saved
    showDataFile(): Promise<void> // shows it in Finder
    exportData(format: DataExportFormat): Promise<string | null> // saved path, or null if cancelled
    clearData(scope: DataClearScope): Promise<StoredData> // the data that's left
    loadSettings(): Promise<SavedSettings | null> // null if nothing has been saved yet
    saveSettings(settings: SavedSettings): Promise<void>
    voiceModel(): Promise<{ url: string; available: boolean }>
    microphoneAccess(): Promise<'granted' | 'denied'>
    keepScreenOn(on: boolean): Promise<void>
    toggleFullscreen(): Promise<void>
    isFullscreen(): Promise<boolean>
    onFullscreenChange(callback: (isFullscreen: boolean) => void): () => void
  }

  interface Window {
    api: LecternAPI
  }
}

// Makes this file a module, which `declare global` above needs
export {}
