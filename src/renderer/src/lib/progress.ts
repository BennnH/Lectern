// Saves where you are in each book (stored in the app's local storage)
export type Progress = {
  page: number // PDF page
  total: number // PDF page count
  block?: number // position in reflow mode
  percent?: number // 0 to 1
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

// How far through a book you are, as a whole-number percentage
export function percentRead(progress: Progress | null): number {
  if (!progress) return 0
  const fraction = progress.percent ?? progress.page / progress.total
  return Math.round(fraction * 100)
}
