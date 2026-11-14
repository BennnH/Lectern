// Reader preferences, shared by every book and remembered between launches
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

export const DEFAULT_SETTINGS: ReaderSettings = {
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

const KEY = 'lectern:reader-settings'

export function loadSettings(): ReaderSettings {
  try {
    const raw = localStorage.getItem(KEY)
    return raw
      ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<ReaderSettings>) }
      : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(settings: ReaderSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings))
  } catch {
    // Not worth crashing over
  }
}

// The next step up or down a list of sizes (used for both zoom and font size)
export function stepThrough(steps: number[], value: number, direction: 1 | -1): number {
  if (direction === 1) return steps.find((step) => step > value + 0.001) ?? value
  return [...steps].reverse().find((step) => step < value - 0.001) ?? value
}
