import { app, ipcMain } from 'electron'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs'
import { join } from 'path'

// Everything Lectern remembers about your reading (progress and sessions), saved as one
// JSON file: ~/Library/Application Support/Lectern/lectern-data.json on a Mac.
// The dev app and the built app both use this same file.
const dataDir = join(app.getPath('appData'), 'Lectern')
const dataFile = join(dataDir, 'lectern-data.json')

let data: StoredData = { version: 1, progress: {}, sessions: [] }
let writeTimer: NodeJS.Timeout | null = null

function load(): void {
  if (!existsSync(dataFile)) return
  try {
    data = { ...data, ...(JSON.parse(readFileSync(dataFile, 'utf8')) as Partial<StoredData>) }
  } catch {
    // Never overwrite a file we couldn't read: keep a copy so nothing is lost
    renameSync(dataFile, `${dataFile}.unreadable-${Date.now()}`)
  }
}

// Write to a temporary file first, then swap it in, so a crash mid-write can't corrupt it
function writeNow(): void {
  if (writeTimer) clearTimeout(writeTimer)
  writeTimer = null
  mkdirSync(dataDir, { recursive: true })
  const temp = `${dataFile}.tmp`
  writeFileSync(temp, JSON.stringify(data))
  renameSync(temp, dataFile)
}

// Changes are saved a moment later in one go, rather than on every single page turn
function scheduleWrite(): void {
  if (!writeTimer) writeTimer = setTimeout(writeNow, 1500)
}

export function registerStoreHandlers(): void {
  load()

  ipcMain.handle('data:load', () => data)

  ipcMain.handle('data:save-progress', (_event, bookId: string, progress: BookProgress) => {
    data.progress[bookId] = progress
    scheduleWrite()
  })

  ipcMain.handle('data:save-session', (_event, session: ReadingSession) => {
    const index = data.sessions.findIndex((s) => s.id === session.id)
    if (index === -1) data.sessions.push(session)
    else data.sessions[index] = session
    scheduleWrite()
  })

  // Make sure the last few changes are on disk before the app closes. It's done twice,
  // to catch anything the reader saves while its window is closing.
  const flush = (): void => {
    if (writeTimer) writeNow()
  }
  app.on('before-quit', flush)
  app.on('will-quit', flush)
}
