// Voice preferences, remembered between launches (voice itself always starts off)

export type VoiceSettings = {
  // The browser's built-in noise filter on the microphone. Worth comparing on and off.
  noiseFilter: boolean
}

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = { noiseFilter: true }

const STORAGE_KEY = 'lectern:voice-settings'

export function loadVoiceSettings(): VoiceSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    return { ...DEFAULT_VOICE_SETTINGS, ...saved }
  } catch {
    return DEFAULT_VOICE_SETTINGS
  }
}

export function saveVoiceSettings(settings: VoiceSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Not being able to remember a preference isn't worth bothering anyone about
  }
}
