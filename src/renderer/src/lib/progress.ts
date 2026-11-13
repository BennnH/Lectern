// Saves where you are in each book (stored in the app's local storage)
export type Progress = {
  page: number
  total: number
  lastOpened: number
}

const key = (bookId: string): string => `lectern:progress:${bookId}`

export function getProgress(bookId: string): Progress | null {
  try {
    const raw = localStorage.getItem(key(bookId))
    return raw ? (JSON.parse(raw) as Progress) : null
  } catch {
    return null
  }
}

export function saveProgress(bookId: string, progress: Progress): void {
  try {
    localStorage.setItem(key(bookId), JSON.stringify(progress))
  } catch {
    // Storage full or unavailable: not worth crashing over
  }
}
