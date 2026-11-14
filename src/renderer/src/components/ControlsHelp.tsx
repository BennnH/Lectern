import { motion } from 'motion/react'
import { X } from 'lucide-react'
import { COMMANDS, COMMAND_GROUPS, keyLabels, shortcut, type Command } from '../lib/commands'
import type { ReadingMode } from '../lib/settings'
import { EASE_OUT } from '../lib/motion'

type Props = {
  mode: ReadingMode
  onClose: () => void
}

function Keys({ command }: { command: Command }): React.JSX.Element {
  return (
    <div className="flex flex-wrap justify-end gap-1">
      {keyLabels(command).map((label) => (
        <kbd
          key={label}
          className="min-w-[1.6rem] rounded-md bg-white/10 px-1.5 py-0.5 text-center font-sans text-xs text-neutral-200 ring-1 ring-white/10"
        >
          {label}
        </kbd>
      ))}
    </div>
  )
}

function VoiceWords({ command }: { command: Command }): React.JSX.Element {
  if (command.voice.length === 0) return <span className="text-sm text-neutral-700">–</span>
  return (
    <div className="flex flex-wrap gap-x-2 gap-y-0.5">
      {command.voice.map((word, i) => (
        <span key={word} className={`text-sm ${i === 0 ? 'text-sky-300' : 'text-neutral-500'}`}>
          “{word}”
        </span>
      ))}
    </div>
  )
}

// Every key and voice command, built from the command list in lib/commands.ts
export default function ControlsHelp({ mode, onClose }: Props): React.JSX.Element {
  return (
    <motion.div
      className="app-no-drag fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 6, scale: 0.98 }}
        transition={{ duration: 0.3, ease: EASE_OUT }}
        className="no-scrollbar max-h-[90vh] w-[640px] max-w-[92vw] overflow-y-auto rounded-2xl bg-neutral-900/95 px-7 py-6 shadow-2xl ring-1 shadow-black/50 ring-white/10"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-medium tracking-[0.18em] text-neutral-500 uppercase">
              Controls
            </p>
            <h2 className="mt-1 text-lg font-semibold text-neutral-100">Keys and voice commands</h2>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="-mt-1 -mr-2 flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-[1fr_auto_10rem] items-center gap-x-5 gap-y-2">
          <span />
          <span className="text-right text-[11px] tracking-wider text-neutral-600 uppercase">
            Keys
          </span>
          <span className="text-[11px] tracking-wider text-neutral-600 uppercase">Voice</span>

          {COMMAND_GROUPS.map((group) => (
            <div key={group} className="contents">
              <p className="col-span-3 mt-2 text-[11px] font-medium tracking-[0.18em] text-neutral-500 uppercase">
                {group}
              </p>
              {COMMANDS.filter((command) => command.group === group).map((command) => {
                const unavailable = command.only !== undefined && command.only !== mode
                return (
                  <div
                    key={command.id}
                    className={`contents ${unavailable ? '[&>*]:opacity-40' : ''}`}
                  >
                    <p className="text-sm whitespace-nowrap text-neutral-200">
                      {command.label}
                      {command.only === 'original' && (
                        <span className="ml-2 text-xs text-neutral-500">original pages</span>
                      )}
                    </p>
                    <Keys command={command} />
                    <VoiceWords command={command} />
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        <p className="mt-5 text-xs leading-relaxed text-neutral-500">
          Say voice words on their own. Voice mode is coming soon. You can also click the right or
          left half of the page to turn it. Press {shortcut('help.toggle')} or Esc to close.
        </p>
      </motion.div>
    </motion.div>
  )
}
