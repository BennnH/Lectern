// Shapes of the reading data Lectern saves. Shared by the main process and the UI.

// Where Lectern looks for your PDFs
interface LibraryFolder {
  path: string
  shortPath: string // with ~ for your home folder, e.g. ~/Documents/Lectern
  isDefault: boolean // the default folder, Documents/Lectern
  found: boolean // false if a folder you chose has gone (e.g. its drive is unplugged)
}

// What happened to the files dropped on the Library
interface AddBooksResult {
  added: string[] // titles of the books copied into the library folder
  alreadyThere: string[] // titles of books that were already in the library
  notPdf: number // how many files weren't PDFs
}

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

// What happened when importing a backup (Data page)
type DataImportResult =
  | { status: 'cancelled' }
  | { status: 'invalid'; reason: string } // not a Lectern backup, too new, too big…
  | { status: 'imported'; sessions: number; books: number } // how many were new or more recent

// Your preferences as saved in settings.json. The UI decides what's in it
// (see src/renderer/src/lib/settings.ts), so to the main process it's just an object.
type SavedSettings = Record<string, unknown>

// Ways to export the data (Data page)
type DataExportFormat = 'json' | 'csv'

// What "clear" removes: just the reading stats, or everything including your place in books
type DataClearScope = 'stats' | 'all'
