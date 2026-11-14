import { useEffect } from 'react'
import type { ReadingMode } from './settings'

// Every action you can trigger in the reader, in one place.
// The keyboard, the toolbar and (soon) voice all run commands from this list,
// and the controls overlay (?) is built from it, so it can never go out of date.
// To add a command: add its id below, add an entry to COMMANDS, then give it an
// action in Reader.tsx.

export type CommandId =
  | 'page.next'
  | 'page.prev'
  | 'size.bigger'
  | 'size.smaller'
  | 'size.reset'
  | 'view.mode'
  | 'view.theme'
  | 'view.crop'
  | 'view.fit'
  | 'stats.toggle'
  | 'book.close'
  | 'window.fullscreen'
  | 'help.toggle'

export type CommandGroup = 'Pages' | 'Text and view' | 'Session' | 'Window'

export type Command = {
  id: CommandId
  label: string
  group: CommandGroup
  // Keys that run it (KeyboardEvent.key, letters in lower case). The first is shown in hints.
  keys: string[]
  // Words to say in voice mode, each said on its own. The first is the main one.
  voice: string[]
  // Only works in this reading mode
  only?: ReadingMode
}

export const COMMANDS: Command[] = [
  {
    id: 'page.next',
    label: 'Next page',
    group: 'Pages',
    keys: ['ArrowRight', ' ', 'ArrowDown', 'PageDown'],
    voice: ['turn', 'next']
  },
  {
    id: 'page.prev',
    label: 'Previous page',
    group: 'Pages',
    keys: ['ArrowLeft', 'ArrowUp', 'PageUp'],
    voice: ['back', 'previous', 'go back']
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
    voice: ['stats', 'statistics']
  },
  {
    id: 'book.close',
    label: 'Back to library',
    group: 'Session',
    keys: ['Escape'],
    voice: ['library', 'done']
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
    voice: []
  }
]

export const COMMAND_GROUPS: CommandGroup[] = ['Pages', 'Text and view', 'Session', 'Window']

// What each screen does for each command (a screen only lists the ones it supports)
export type CommandActions = Partial<Record<CommandId, () => void>>

// How keys are written on screen
const KEY_LABELS: Record<string, string> = {
  ArrowRight: '→',
  ArrowLeft: '←',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ' ': 'Space',
  PageDown: 'PgDn',
  PageUp: 'PgUp',
  Escape: 'Esc',
  '=': '+',
  '-': '−',
  _: '−'
}

const BY_ID = new Map(COMMANDS.map((command) => [command.id, command]))
const BY_KEY = new Map(COMMANDS.flatMap((command) => command.keys.map((key) => [key, command.id])))

export function getCommand(id: CommandId): Command {
  return BY_ID.get(id)!
}

export function keyLabel(key: string): string {
  return KEY_LABELS[key] ?? key.toUpperCase()
}

// A command's keys as shown on screen, without repeats (+ and = are the same key)
export function keyLabels(command: Command): string[] {
  return [...new Set(command.keys.map(keyLabel))]
}

// The main key for a command, for hints like "Theme (T)"
export function shortcut(id: CommandId): string {
  return keyLabel(getCommand(id).keys[0])
}

// Which command a key press means (if any)
export function commandForKey(e: KeyboardEvent): CommandId | null {
  if (e.metaKey || e.ctrlKey || e.altKey) return null // leave Cmd+Q, Cmd+R etc. alone
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
  return BY_KEY.get(key) ?? null
}

// Runs the matching action whenever a command's key is pressed
export function useCommandKeys(actions: CommandActions): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
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
