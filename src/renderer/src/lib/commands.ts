import { useEffect } from 'react'
import { getSettings, type ReadingMode, type Shortcuts } from './settings'

// Every action you can trigger in the reader, in one place.
// The keyboard, the toolbar and voice all run commands from this list,
// and the controls overlay (?) is built from it, so it can never go out of date.
// To add a command: add its id below, add an entry to COMMANDS, then give it an
// action in Reader.tsx.
//
// The keys listed here are the defaults: you can change them in Settings (saved in
// settings.json as `shortcuts`), apart from commands marked `fixed`.
//
// Choosing voice words: in testing, longer or more distinctive phrases ("next", "go back",
// "my stats", "library") were recognised far more reliably than short similar-sounding
// words ("turn", "back", "stats", "done"), which were often mistaken for each other.
// Every word listed here is one more thing the recogniser can mishear, so keep them distinct.

export type CommandId =
  | 'page.next'
  | 'page.prev'
  | 'page.goto'
  | 'size.bigger'
  | 'size.smaller'
  | 'size.reset'
  | 'view.mode'
  | 'view.theme'
  | 'view.crop'
  | 'view.fit'
  | 'stats.toggle'
  | 'book.close'
  | 'voice.toggle'
  | 'window.fullscreen'
  | 'help.toggle'

export type CommandGroup = 'Pages' | 'Text and view' | 'Session' | 'Window'

export type Command = {
  id: CommandId
  label: string
  group: CommandGroup
  // Default keys that run it, written as keyFromEvent() below writes them. The first is
  // shown in hints.
  keys: string[]
  // Its keys can't be changed in Settings
  fixed?: boolean
  // Words to say in voice mode, each said on its own. The first is the main one.
  voice: string[]
  // Voice only runs it when said twice in a row (for commands that are a pain to undo)
  strict?: boolean
  // Only works in this reading mode
  only?: ReadingMode
}

export const COMMANDS: Command[] = [
  {
    id: 'page.next',
    label: 'Next page',
    group: 'Pages',
    keys: ['ArrowRight', ' ', 'ArrowDown', 'PageDown'],
    voice: ['next', 'turn']
  },
  {
    id: 'page.prev',
    label: 'Previous page',
    group: 'Pages',
    keys: ['ArrowLeft', 'ArrowUp', 'PageUp'],
    voice: ['go back', 'previous']
  },
  {
    id: 'page.goto',
    label: 'Go to page',
    group: 'Pages',
    keys: ['g'],
    voice: []
  },
  {
    id: 'size.bigger',
    label: 'Bigger text / zoom in',
    group: 'Text and view',
    keys: ['+', '='],
    voice: ['bigger']
  },
  {
    id: 'size.smaller',
    label: 'Smaller text / zoom out',
    group: 'Text and view',
    keys: ['-', '_'],
    voice: ['smaller']
  },
  {
    id: 'size.reset',
    label: 'Default size',
    group: 'Text and view',
    keys: ['0'],
    voice: []
  },
  {
    id: 'view.mode',
    label: 'Reflow text / original pages',
    group: 'Text and view',
    keys: ['r'],
    voice: []
  },
  {
    id: 'view.theme',
    label: 'Change theme',
    group: 'Text and view',
    keys: ['t'],
    voice: []
  },
  {
    id: 'view.crop',
    label: 'Trim margins',
    group: 'Text and view',
    keys: ['c'],
    voice: [],
    only: 'original'
  },
  {
    id: 'view.fit',
    label: 'Fit to width',
    group: 'Text and view',
    keys: ['w'],
    voice: [],
    only: 'original'
  },
  {
    id: 'stats.toggle',
    label: 'Session stats',
    group: 'Session',
    keys: ['i'],
    voice: ['my stats', 'statistics']
  },
  {
    id: 'book.close',
    label: 'Back to library',
    group: 'Session',
    keys: ['Escape'],
    voice: ['library'],
    strict: true,
    fixed: true
  },
  {
    id: 'voice.toggle',
    label: 'Voice commands on / off',
    group: 'Session',
    keys: ['v'],
    voice: []
  },
  {
    id: 'window.fullscreen',
    label: 'Full screen',
    group: 'Window',
    keys: ['f'],
    voice: []
  },
  {
    id: 'help.toggle',
    label: 'Show controls',
    group: 'Window',
    keys: ['?'],
    voice: [],
    fixed: true
  }
]

export const COMMAND_GROUPS: CommandGroup[] = ['Pages', 'Text and view', 'Session', 'Window']

// What each screen does for each command (a screen only lists the ones it supports)
export type CommandActions = Partial<Record<CommandId, () => void>>

const isMac = window.api.platform === 'darwin'

const BY_ID = new Map(COMMANDS.map((command) => [command.id, command]))

export function getCommand(id: CommandId): Command {
  return BY_ID.get(id)!
}

// --- Keys ---

// A key press written the way shortcuts are saved: the key's name ('t', 'ArrowRight', ' ' for
// Space), with 'Shift+' in front if Shift was held with a letter or a named key. Symbols like
// ? and + already show Shift was used, so they don't get it. Letters are lower case, so Caps
// Lock doesn't matter. Null for presses with ⌘, Control or Option, which are left for the app
// and macOS (⌘Q, ⌘1…).
export function keyFromEvent(e: KeyboardEvent): string | null {
  if (e.metaKey || e.ctrlKey || e.altKey) return null
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
  const named = key.length > 1 || key === ' '
  return e.shiftKey && (named || /^[a-z]$/.test(key)) ? `Shift+${key}` : key
}

// Keys that are only ever held with another key, like Shift
const MODIFIER_KEYS = new Set([
  'Shift',
  'Control',
  'Alt',
  'Meta',
  'CapsLock',
  'Fn',
  'FnLock',
  'Hyper',
  'Super',
  'Symbol',
  'SymbolLock',
  'NumLock',
  'ScrollLock'
])

export function isModifierKey(key: string): boolean {
  return MODIFIER_KEYS.has(key)
}

// Keys that always do the same thing, so they can't be given to a command
const RESERVED: Record<string, string> = {
  Escape: 'Esc always goes back to the library.',
  '?': '? always shows the controls.',
  Tab: 'Tab moves between buttons.',
  'Shift+Tab': 'Tab moves between buttons.'
}

// Why a key can't be used as a shortcut, or null if it can
export function keyProblem(key: string): string | null {
  if (key in RESERVED) return RESERVED[key]
  const name = key.replace(/^Shift\+/, '')
  if (isModifierKey(name) || ['Dead', 'Unidentified', 'Process', 'Compose'].includes(name)) {
    return "That key can't be used."
  }
  return null
}

// A command's keys: your own from Settings, or the defaults
export function keysFor(id: CommandId, shortcuts: Shortcuts = getSettings().shortcuts): string[] {
  const command = getCommand(id)
  const custom = shortcuts[id]
  if (command.fixed || !custom) return command.keys
  return custom.filter((key) => keyProblem(key) === null)
}

// Which command a key belongs to (null if none)
export function commandUsingKey(key: string, shortcuts: Shortcuts): CommandId | null {
  return COMMANDS.find((command) => keysFor(command.id, shortcuts).includes(key))?.id ?? null
}

// Every key and its command, worked out again only when your shortcuts change
let keyMap: { shortcuts: Shortcuts; byKey: Map<string, CommandId> } | null = null

function commandsByKey(): Map<string, CommandId> {
  const { shortcuts } = getSettings()
  if (keyMap?.shortcuts !== shortcuts) {
    const pairs = COMMANDS.flatMap((command) =>
      keysFor(command.id, shortcuts).map((key): [string, CommandId] => [key, command.id])
    )
    keyMap = { shortcuts, byKey: new Map(pairs) }
  }
  return keyMap.byKey
}

// Which command a key press means (if any)
export function commandForKey(e: KeyboardEvent): CommandId | null {
  const key = keyFromEvent(e)
  if (key === null) return null
  const byKey = commandsByKey()
  // Shift+T does what T does, unless Shift+T has a command of its own
  const withoutShift = key.startsWith('Shift+') ? byKey.get(key.slice('Shift+'.length)) : undefined
  return byKey.get(key) ?? withoutShift ?? null
}

// --- Showing keys on screen ---

const KEY_LABELS: Record<string, string> = {
  ArrowRight: '→',
  ArrowLeft: '←',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ' ': 'Space',
  PageDown: 'PgDn',
  PageUp: 'PgUp',
  Escape: 'Esc',
  Enter: isMac ? 'Return' : 'Enter',
  Backspace: isMac ? 'Delete' : 'Backspace',
  Delete: isMac ? 'Fwd Delete' : 'Delete',
  MediaPlayPause: 'Play/Pause',
  MediaTrackNext: 'Next track',
  MediaTrackPrevious: 'Previous track',
  '=': '+',
  '-': '−',
  _: '−'
}

export function keyLabel(key: string): string {
  if (key.startsWith('Shift+')) return `${isMac ? '⇧' : 'Shift+'}${keyLabel(key.slice(6))}`
  return KEY_LABELS[key] ?? (key.length === 1 ? key.toUpperCase() : key)
}

// A command's keys as shown on screen, without repeats (+ and = are the same key)
export function keyLabels(command: Command, shortcuts?: Shortcuts): string[] {
  return [...new Set(keysFor(command.id, shortcuts).map(keyLabel))]
}

// The main key for a command, for hints like "Theme (T)". Null if it has no keys.
export function shortcut(id: CommandId): string | null {
  const key = keysFor(id)[0]
  return key === undefined ? null : keyLabel(key)
}

// --- Voice ---

// Every voice phrase, so the recogniser only listens for these
export const VOICE_PHRASES: string[] = COMMANDS.flatMap((command) => command.voice)

const BY_PHRASE = new Map(
  COMMANDS.flatMap((command) => command.voice.map((phrase) => [phrase, command.id]))
)

// Which command a spoken phrase means (if any). Only exact phrases count.
export function commandForPhrase(phrase: string): CommandId | null {
  return BY_PHRASE.get(phrase) ?? null
}

// Whether a key press is going into a text box (where keys mean letters, not commands)
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable || target instanceof HTMLTextAreaElement) return true
  return target instanceof HTMLInputElement && ['text', 'number', 'search'].includes(target.type)
}

// Runs the matching action whenever a command's key is pressed
export function useCommandKeys(actions: CommandActions): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (isTyping(e.target)) return // typing a page number shouldn't turn pages
      const id = commandForKey(e)
      const action = id ? actions[id] : undefined
      if (!action) return
      e.preventDefault()
      action()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [actions])
}
