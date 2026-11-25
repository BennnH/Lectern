import type { CommandId } from './commands'
import { PALETTES } from './palettes'

// All of Lectern's preferences: how the reader looks, calendar colours, voice and so on.
// They're loaded once when the app starts and kept in memory; every change is also sent to
// the main process, which saves them to settings.json (see src/main/settings.ts).

// --- The reader (shared by every book) ---

export type ReadingMode = 'reflow' | 'original'
export type FitMode = 'page' | 'width'
export type PageTheme = 'light' | 'sepia' | 'dark'

export type ReaderSettings = {
  mode: ReadingMode // reflow = Kindle-style text, original = the PDF's own pages
  fontSize: number // reflow text size in px
  fit: FitMode
  zoom: number
  crop: boolean
  theme: PageTheme
}

export const DEFAULT_READER_SETTINGS: ReaderSettings = {
  mode: 'reflow',
  fontSize: 22,
  fit: 'page',
  zoom: 1,
  crop: true,
  theme: 'light'
}

// Zoom steps for original pages, relative to "fits the window" (1 = 100%)
export const ZOOM_STEPS = [0.5, 0.67, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5]

// Text sizes for reflow mode (px)
export const FONT_SIZES = [14, 16, 18, 20, 22, 24, 27, 30, 34, 38, 44]

export const THEMES: PageTheme[] = ['light', 'sepia', 'dark']

// Colours for each theme in reflow mode (real text colours, not an inverted image)
export const REFLOW_COLOURS: Record<PageTheme, { background: string; text: string }> = {
  light: { background: '#f8f6f1', text: '#1f1d1a' },
  sepia: { background: '#f2e8d3', text: '#3b3022' },
  dark: { background: '#101010', text: '#d9d4ca' }
}

// The next step up or down a list of sizes (used for both zoom and font size)
export function stepThrough(steps: number[], value: number, direction: 1 | -1): number {
  if (direction === 1) return steps.find((step) => step > value + 0.001) ?? value
  return [...steps].reverse().find((step) => step < value - 0.001) ?? value
}

// --- Voice (voice itself always starts off) ---

export type VoiceSettings = {
  // The browser's built-in noise filter on the microphone. Worth comparing on and off.
  noiseFilter: boolean
}

// --- Keyboard shortcuts ---

// Commands whose keys you've changed, and their keys (see lib/commands.ts). Commands not
// listed use their default keys.
export type Shortcuts = Partial<Record<CommandId, string[]>>

// --- Everything together ---

export type Settings = {
  reader: ReaderSettings
  voice: VoiceSettings
  calendarPalette: string // a palette id from lib/palettes.ts
  dailyGoal: number | null // pages a day, or null for no goal
  shortcuts: Shortcuts
}

const DEFAULTS: Settings = {
  reader: DEFAULT_READER_SETTINGS,
  voice: { noiseFilter: true },
  calendarPalette: PALETTES[0].id,
  dailyGoal: null,
  shortcuts: {}
}

let current: Settings = DEFAULTS

// Call once when the app starts, before anything uses getSettings()
export async function loadSettings(): Promise<void> {
  const saved = await window.api.loadSettings()
  if (saved) {
    current = withDefaults(saved)
  } else {
    current = importOldSettings()
    window.api.saveSettings(current)
  }
}

export function getSettings(): Settings {
  return current
}

// Changes some settings and saves them
export function updateSettings(change: Partial<Settings>): void {
  current = { ...current, ...change }
  window.api.saveSettings(current)
}

// Settings saved by an older version may be missing something: fill in the defaults
function withDefaults(saved: SavedSettings): Settings {
  const palette = saved.calendarPalette
  const goal = saved.dailyGoal
  return {
    reader: { ...DEFAULTS.reader, ...(saved.reader as Partial<ReaderSettings>) },
    voice: { ...DEFAULTS.voice, ...(saved.voice as Partial<VoiceSettings>) },
    calendarPalette: typeof palette === 'string' ? palette : DEFAULTS.calendarPalette,
    dailyGoal: typeof goal === 'number' && goal >= 1 ? Math.round(goal) : null,
    shortcuts: readShortcuts(saved.shortcuts)
  }
}

// Keeps only lists of keys (lib/commands.ts ignores commands and keys it doesn't know)
function readShortcuts(saved: unknown): Shortcuts {
  if (typeof saved !== 'object' || saved === null) return {}
  const shortcuts: Record<string, string[]> = {}
  for (const [id, keys] of Object.entries(saved)) {
    if (Array.isArray(keys)) shortcuts[id] = keys.filter((key) => typeof key === 'string')
  }
  return shortcuts
}

// Before settings.json, preferences were kept in the window's own storage. This brings them
// across the first time (the old copies are left alone: nothing reads them any more).
function importOldSettings(): Settings {
  const read = (key: string): unknown => {
    try {
      return JSON.parse(localStorage.getItem(key) ?? 'null')
    } catch {
      return null
    }
  }
  return withDefaults({
    reader: read('lectern:reader-settings'),
    voice: read('lectern:voice-settings'),
    calendarPalette: localStorage.getItem('lectern:calendar-palette')
  })
}
