// Shapes of the reading data Lectern saves. Shared by the main process and the UI.

// Where you are in a book
interface BookProgress {
  page: number // PDF page
  total: number // PDF page count
  block?: number // position in reflow mode
  percent?: number // 0 to 1
  lastOpened: number
}

// One sitting with one book
interface ReadingSession {
  id: string
  bookId: string // the book's fingerprint
  title: string
  start: number // when it started (ms since 1970)
  end: number // the last page turn
  activeMs: number // reading time, ignoring quick flicks and long breaks
  startPage: number
  endPage: number // where you stopped
  furthestPage: number
  totalPages: number
  pagesRead: number // real PDF pages you spent 7+ seconds on, each counted once per session
  seen: boolean // whether its recap card has been shown
}

interface StoredData {
  version: number
  progress: Record<string, BookProgress> // keyed by book fingerprint
  sessions: ReadingSession[]
}

// Ways to export the data (Data page)
type DataExportFormat = 'json' | 'csv'

// What "clear" removes: just the reading stats, or everything including your place in books
type DataClearScope = 'stats' | 'all'
