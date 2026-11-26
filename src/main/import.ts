import { app, dialog, type BrowserWindow } from 'electron'
import { readFile, stat } from 'fs/promises'

// Reading a backup made with Data page → Export → Everything (JSON) back in. Nothing you
// already have is overwritten: sessions you don't have are added, and for each book the most
// recent place wins. Importing the same backup twice changes nothing.

// Far bigger than any real backup (years of reading is a few MB)
const MAX_BYTES = 50 * 1024 * 1024

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

// A session from the backup, or null if it's damaged. Only the fields Lectern knows are kept.
function readSession(value: unknown): ReadingSession | null {
  if (!isObject(value)) return null
  const { id, bookId, title } = value
  if (typeof id !== 'string' || typeof bookId !== 'string' || typeof title !== 'string') return null
  const numbers = [
    'start',
    'end',
    'activeMs',
    'startPage',
    'endPage',
    'furthestPage',
    'totalPages',
    'pagesRead'
  ] as const
  if (!numbers.every((key) => isNumber(value[key]))) return null
  const n = (key: (typeof numbers)[number]): number => value[key] as number
  return {
    id,
    bookId,
    title,
    start: n('start'),
    end: n('end'),
    activeMs: n('activeMs'),
    startPage: n('startPage'),
    endPage: n('endPage'),
    furthestPage: n('furthestPage'),
    totalPages: n('totalPages'),
    pagesRead: n('pagesRead'),
    seen: true // so old sessions don't pop up recap cards
  }
}

// Your place in a book from the backup, or null if it's damaged
function readProgress(value: unknown): BookProgress | null {
  if (!isObject(value)) return null
  const { page, total, lastOpened, block, percent } = value
  if (!isNumber(page) || !isNumber(total) || !isNumber(lastOpened)) return null
  return {
    page,
    total,
    lastOpened,
    ...(isNumber(block) ? { block } : {}),
    ...(isNumber(percent) ? { percent } : {})
  }
}

// What's in a backup file, or why it can't be used
function readBackup(
  text: string
): { sessions: ReadingSession[]; progress: Record<string, BookProgress> } | string {
  let backup: unknown
  try {
    backup = JSON.parse(text)
  } catch {
    return "That file isn't a Lectern backup."
  }
  if (!isObject(backup) || !Array.isArray(backup.sessions) || !isObject(backup.progress)) {
    return "That file isn't a Lectern backup."
  }
  if (!isNumber(backup.version) || backup.version > 1) {
    return 'That backup was made by a newer version of Lectern.'
  }
  const sessions = backup.sessions.map(readSession).filter((s) => s !== null)
  const progress: Record<string, BookProgress> = {}
  for (const [bookId, value] of Object.entries(backup.progress)) {
    const place = readProgress(value)
    if (place) progress[bookId] = place
  }
  return { sessions, progress }
}

// Adds what's new in the backup to your data. Returns the result and how much was added.
function merge(
  current: StoredData,
  backup: { sessions: ReadingSession[]; progress: Record<string, BookProgress> }
): { data: StoredData; sessions: number; books: number } {
  const sessions = [...current.sessions]
  const where = new Map(sessions.map((session, index) => [session.id, index]))
  let addedSessions = 0
  for (const session of backup.sessions) {
    const index = where.get(session.id)
    if (index === undefined) {
      where.set(session.id, sessions.length)
      sessions.push(session)
      addedSessions += 1
    } else if (session.end > sessions[index].end) {
      // The same session, but the backup has more of it
      sessions[index] = session
      addedSessions += 1
    }
  }

  const progress = { ...current.progress }
  let addedBooks = 0
  for (const [bookId, place] of Object.entries(backup.progress)) {
    const mine = progress[bookId]
    if (!mine || place.lastOpened > mine.lastOpened) {
      progress[bookId] = place
      addedBooks += 1
    }
  }

  sessions.sort((a, b) => a.start - b.start)
  return { data: { ...current, sessions, progress }, sessions: addedSessions, books: addedBooks }
}

// Asks which backup to import, then merges it into `current`
export async function importData(
  window: BrowserWindow | null,
  current: StoredData
): Promise<{ result: DataImportResult; data: StoredData | null }> {
  const options: Electron.OpenDialogOptions = {
    title: 'Import a Lectern backup',
    buttonLabel: 'Import',
    defaultPath: app.getPath('downloads'),
    filters: [{ name: 'Lectern backup (JSON)', extensions: ['json'] }],
    properties: ['openFile']
  }
  const chosen = window
    ? await dialog.showOpenDialog(window, options)
    : await dialog.showOpenDialog(options)
  const file = chosen.filePaths[0]
  if (chosen.canceled || !file) return { result: { status: 'cancelled' }, data: null }

  if ((await stat(file)).size > MAX_BYTES) {
    return {
      result: { status: 'invalid', reason: 'That file is too big to be a Lectern backup.' },
      data: null
    }
  }
  const backup = readBackup(await readFile(file, 'utf8'))
  if (typeof backup === 'string')
    return { result: { status: 'invalid', reason: backup }, data: null }

  const { data, sessions, books } = merge(current, backup)
  return { result: { status: 'imported', sessions, books }, data }
}
