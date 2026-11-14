// Your saved reading data (progress and sessions). It's loaded once when the app starts and
// kept in memory for instant access; every change is also sent to the main process, which
// saves it to disk (see src/main/store.ts).
let data: StoredData = { version: 1, progress: {}, sessions: [] }

export async function loadStore(): Promise<void> {
  data = await window.api.loadData()
}

export function getProgress(bookId: string): BookProgress | null {
  return data.progress[bookId] ?? null
}

export function saveProgress(bookId: string, progress: BookProgress): void {
  data.progress[bookId] = progress
  window.api.saveProgress(bookId, progress)
}

export function getSessions(): ReadingSession[] {
  return data.sessions
}

// Adds a session, or updates it if it's already saved
export function saveSession(session: ReadingSession): void {
  const copy = { ...session }
  const index = data.sessions.findIndex((s) => s.id === copy.id)
  if (index === -1) data.sessions.push(copy)
  else data.sessions[index] = copy
  window.api.saveSession(copy)
}

// How far through a book you are, as a whole-number percentage
export function percentRead(progress: BookProgress | null): number {
  if (!progress) return 0
  const fraction = progress.percent ?? progress.page / progress.total
  return Math.round(fraction * 100)
}

// Progress used to be kept in the app's local storage, keyed by file name.
// This moves it into the data file once, so nobody loses their place.
export function importOldProgress(books: Book[]): void {
  for (const book of books) {
    const key = `lectern:progress:${book.id}`
    const raw = localStorage.getItem(key)
    if (!raw) continue
    try {
      if (!data.progress[book.fingerprint]) {
        saveProgress(book.fingerprint, JSON.parse(raw) as BookProgress)
      }
    } catch {
      // Unreadable old entry: skip it
    }
    localStorage.removeItem(key)
  }
}
