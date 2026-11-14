// Reader preferences, shared by every book and remembered between launches
export type FitMode = 'page' | 'width'
export type PageTheme = 'light' | 'sepia' | 'dark'

export type ReaderSettings = {
  fit: FitMode
  zoom: number
  crop: boolean
  theme: PageTheme
}

export const DEFAULT_SETTINGS: ReaderSettings = {
  fit: 'page',
  zoom: 1,
  crop: true,
  theme: 'light'
}

// Zoom steps, relative to "fits the window" (1 = 100%)
export const ZOOM_STEPS = [0.5, 0.67, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5]

export const THEMES: PageTheme[] = ['light', 'sepia', 'dark']

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

export function nextZoom(zoom: number, direction: 1 | -1): number {
  if (direction === 1) return ZOOM_STEPS.find((step) => step > zoom + 0.001) ?? zoom
  return [...ZOOM_STEPS].reverse().find((step) => step < zoom - 0.001) ?? zoom
}
