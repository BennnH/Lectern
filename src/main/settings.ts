import { app, ipcMain } from 'electron'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs'
import { join } from 'path'

// Your preferences (how the reader looks, calendar colours, voice and so on), saved as one
// JSON file next to your reading data: ~/Library/Application Support/Lectern/settings.json.
// The UI decides what goes in it (see src/renderer/src/lib/settings.ts); this file just
// keeps it safe on disk.
const settingsDir = join(app.getPath('appData'), 'Lectern')
const settingsFile = join(settingsDir, 'settings.json')

// null until there's a settings file (the UI then sets one up)
let settings: SavedSettings | null = null
let writeTimer: NodeJS.Timeout | null = null

function isObject(value: unknown): value is SavedSettings {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function load(): void {
  if (!existsSync(settingsFile)) return
  try {
    const saved: unknown = JSON.parse(readFileSync(settingsFile, 'utf8'))
    if (isObject(saved)) settings = saved
  } catch {
    // Keep a copy of a file we couldn't read, and start again from the defaults
    renameSync(settingsFile, `${settingsFile}.unreadable-${Date.now()}`)
  }
}

// Write to a temporary file first, then swap it in, so a crash mid-write can't corrupt it
function writeNow(): void {
  if (writeTimer) clearTimeout(writeTimer)
  writeTimer = null
  if (!settings) return
  mkdirSync(settingsDir, { recursive: true })
  const temp = `${settingsFile}.tmp`
  writeFileSync(temp, JSON.stringify(settings, null, 2)) // spaced out, so it's readable
  renameSync(temp, settingsFile)
}

export function registerSettingsHandlers(): void {
  load()

  ipcMain.handle('settings:load', () => settings)

  // Saved a moment later, so clicking through text sizes doesn't write the file every time
  ipcMain.handle('settings:save', (_event, value: unknown) => {
    if (!isObject(value)) throw new Error('Settings must be an object')
    settings = value
    if (!writeTimer) writeTimer = setTimeout(writeNow, 500)
  })

  // Make sure the last change is on disk before the app closes
  const flush = (): void => {
    if (writeTimer) writeNow()
  }
  app.on('before-quit', flush)
  app.on('will-quit', flush)
}
