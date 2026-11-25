import { useCallback, useEffect, useState } from 'react'
import { Lock, Plus, X } from 'lucide-react'
import {
  COMMANDS,
  COMMAND_GROUPS,
  commandUsingKey,
  getCommand,
  isModifierKey,
  keyFromEvent,
  keyLabel,
  keyLabels,
  keyProblem,
  keysFor,
  type Command,
  type CommandId
} from '../lib/commands'
import { getSettings, updateSettings, type Shortcuts } from '../lib/settings'

// A message under a command while you change its keys
type Notice = {
  id: CommandId
  text: string
  // A key another command already has, which you can move to this one
  clash?: { key: string; from: CommandId }
}

// A copy of `from` with one command's keys changed. Keys that match the defaults aren't saved,
// so the command keeps following the defaults.
function withKeys(from: Shortcuts, id: CommandId, keys: string[]): Shortcuts {
  const next = { ...from }
  const defaults = getCommand(id).keys
  const isDefault = keys.length === defaults.length && keys.every((key) => defaults.includes(key))
  if (isDefault) delete next[id]
  else next[id] = keys
  return next
}

// Settings → Keyboard shortcuts: add or remove the keys for each reading command
export default function ShortcutSettings(): React.JSX.Element {
  const [shortcuts, setShortcuts] = useState<Shortcuts>(() => getSettings().shortcuts)
  // The command waiting for you to press a key
  const [recording, setRecording] = useState<CommandId | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)

  const save = useCallback((next: Shortcuts) => {
    setShortcuts(next)
    updateSettings({ shortcuts: next })
  }, [])

  // While waiting, the next key you press is added to the command (Esc cancels)
  useEffect(() => {
    if (!recording) return
    const onKey = (e: KeyboardEvent): void => {
      if (isModifierKey(e.key)) return // wait for the key pressed with Shift
      const key = keyFromEvent(e)
      if (key === null) {
        // Leave it alone, so ⌘Q and the like still work
        setNotice({ id: recording, text: 'Use a key on its own, or with Shift.' })
        return
      }
      // Keep the key from doing anything else on the page
      e.preventDefault()
      e.stopPropagation()
      if (key === 'Escape') {
        setRecording(null)
        setNotice(null)
        return
      }
      const problem = keyProblem(key)
      if (problem) {
        setNotice({ id: recording, text: problem })
        return
      }
      setRecording(null)
      setNotice(null)
      const owner = commandUsingKey(key, shortcuts)
      if (owner === recording) return // it already has this key
      if (owner) {
        setNotice({
          id: recording,
          text: `${keyLabel(key)} is already used for ${getCommand(owner).label}.`,
          clash: { key, from: owner }
        })
        return
      }
      save(withKeys(shortcuts, recording, [...keysFor(recording, shortcuts), key]))
    }
    // Listen before anything else on the page sees the key
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [recording, shortcuts, save])

  const startRecording = (id: CommandId): void => {
    setRecording(id)
    setNotice(null)
  }

  // Removes a key as it's shown on screen (removing + removes = too, as it's the same key)
  const removeKey = (id: CommandId, label: string): void => {
    const keys = keysFor(id, shortcuts).filter((key) => keyLabel(key) !== label)
    save(withKeys(shortcuts, id, keys))
    setNotice(null)
  }

  // Takes a key from the command that has it and gives it to `to`
  const moveKey = (to: CommandId, { key, from }: { key: string; from: CommandId }): void => {
    const taken = withKeys(
      shortcuts,
      from,
      keysFor(from, shortcuts).filter((k) => k !== key)
    )
    save(withKeys(taken, to, [...keysFor(to, taken), key]))
    setNotice(null)
  }

  const resetCommand = (id: CommandId): void => {
    const next = { ...shortcuts }
    delete next[id]
    save(next)
    setNotice(null)
  }

  const changed = Object.keys(shortcuts).length > 0

  return (
    <>
      <div className="divide-y divide-white/5 rounded-2xl bg-white/[0.03] ring-1 ring-white/5">
        {COMMAND_GROUPS.map((group) => (
          <div key={group} className="px-5 pt-3 pb-2">
            <h3 className="py-1 text-[11px] font-medium tracking-[0.16em] text-neutral-500 uppercase">
              {group}
            </h3>
            {COMMANDS.filter((command) => command.group === group).map((command) => (
              <ShortcutRow
                key={command.id}
                command={command}
                labels={keyLabels(command, shortcuts)}
                changed={shortcuts[command.id] !== undefined}
                recording={recording === command.id}
                notice={notice?.id === command.id ? notice : null}
                onAdd={() => startRecording(command.id)}
                onCancel={() => setRecording(null)}
                onRemove={(label) => removeKey(command.id, label)}
                onReset={() => resetCommand(command.id)}
                onMove={(clash) => moveKey(command.id, clash)}
                onDismiss={() => setNotice(null)}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between gap-4">
        <p className="text-xs text-neutral-500">
          Esc, ? and shortcuts with ⌘ always stay the same.
        </p>
        <button
          type="button"
          disabled={!changed}
          onClick={() => {
            save({})
            setNotice(null)
          }}
          className="rounded-full border border-white/10 px-4 py-1.5 text-sm text-neutral-300 transition hover:bg-white/5 hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-neutral-300"
        >
          Reset all
        </button>
      </div>
    </>
  )
}

const KEY =
  'inline-flex min-w-[1.6rem] items-center justify-center rounded-md bg-white/10 px-1.5 py-0.5 font-sans text-xs text-neutral-200 ring-1 ring-white/10'

type RowProps = {
  command: Command
  labels: string[] // its keys, as shown on screen
  changed: boolean // its keys aren't the defaults
  recording: boolean // waiting for you to press a key
  notice: Notice | null
  onAdd: () => void
  onCancel: () => void
  onRemove: (label: string) => void
  onReset: () => void
  onMove: (clash: { key: string; from: CommandId }) => void
  onDismiss: () => void
}

// One command and its keys
function ShortcutRow({
  command,
  labels,
  changed,
  recording,
  notice,
  onAdd,
  onCancel,
  onRemove,
  onReset,
  onMove,
  onDismiss
}: RowProps): React.JSX.Element {
  return (
    <div className="py-1.5">
      <div className="flex min-h-7 items-center justify-between gap-4">
        <p className="text-sm text-neutral-200">
          {command.label}
          {command.only === 'original' && (
            <span className="ml-2 text-xs text-neutral-500">original pages</span>
          )}
        </p>

        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {labels.length === 0 && !recording && (
            <span className="text-xs text-neutral-600">No key</span>
          )}
          {labels.map((label) =>
            command.fixed ? (
              <kbd key={label} className={KEY}>
                {label}
              </kbd>
            ) : (
              <kbd key={label} className={`${KEY} gap-0.5 pr-0.5`}>
                {label}
                <button
                  type="button"
                  onClick={() => onRemove(label)}
                  title="Remove"
                  aria-label={`Remove ${label} from ${command.label}`}
                  className="rounded p-0.5 text-neutral-500 transition hover:bg-white/10 hover:text-white"
                >
                  <X size={11} />
                </button>
              </kbd>
            )
          )}

          {command.fixed ? (
            <span title="Can't be changed" className="p-1 text-neutral-600">
              <Lock size={13} />
            </span>
          ) : recording ? (
            <button
              type="button"
              onClick={onCancel}
              title="Press Esc to cancel"
              className="animate-pulse rounded-md px-2 py-0.5 text-xs text-neutral-100 ring-1 ring-white/40"
            >
              Press a key…
            </button>
          ) : (
            <button
              type="button"
              onClick={onAdd}
              title="Add a key"
              aria-label={`Add a key for ${command.label}`}
              className="rounded-md p-1 text-neutral-500 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white"
            >
              <Plus size={13} />
            </button>
          )}

          {changed && !recording && (
            <button
              type="button"
              onClick={onReset}
              title="Back to the default keys"
              className="ml-1 text-xs text-neutral-500 transition hover:text-white"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {notice && (
        <div className="mt-1 flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-xs">
          <p className={notice.clash ? 'text-neutral-400' : 'text-amber-300/90'}>{notice.text}</p>
          {notice.clash && (
            <>
              <button
                type="button"
                onClick={() => onMove(notice.clash!)}
                className="text-neutral-100 underline-offset-2 hover:underline"
              >
                Use it here instead
              </button>
              <button
                type="button"
                onClick={onDismiss}
                className="text-neutral-500 transition hover:text-white"
              >
                Keep it there
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
