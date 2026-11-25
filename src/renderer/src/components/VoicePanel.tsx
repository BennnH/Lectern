import { motion } from 'motion/react'
import { X } from 'lucide-react'
import { getCommand } from '../lib/commands'
import type { VoiceLogEntry, VoiceState } from '../lib/voice/useVoiceCommands'
import type { VoiceSettings } from '../lib/voice/settings'
import { EASE_OUT } from '../lib/motion'
import { LevelBar } from './VoiceLevel'

type Props = {
  voice: VoiceState
  settings: VoiceSettings
  onChangeSettings: (settings: VoiceSettings) => void
  onClose: () => void
}

const STATUS_TEXT = {
  off: 'Off',
  starting: 'Starting…',
  listening: 'Listening',
  error: 'Not working'
}

const SHOWN_ENTRIES = 8

function clock(time: number): string {
  return new Date(time).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function Outcome({ entry }: { entry: VoiceLogEntry }): React.JSX.Element {
  const { decision } = entry
  if (decision.kind === 'run') {
    return <span className="text-emerald-400">{getCommand(decision.id).label}</span>
  }
  if (decision.kind === 'confirm') {
    return <span className="text-amber-300">Say it again to confirm</span>
  }
  return <span className="text-neutral-500">{decision.reason}</span>
}

// What voice is hearing and why it did (or didn't) act: for testing it in real rooms
export default function VoicePanel({
  voice,
  settings,
  onChangeSettings,
  onClose
}: Props): React.JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: EASE_OUT }}
      className="app-no-drag absolute top-12 left-6 z-[65] w-80 rounded-2xl bg-neutral-900/95 p-4 text-sm ring-1 ring-white/10 backdrop-blur-md"
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium tracking-[0.16em] text-neutral-500 uppercase">
          Voice · {STATUS_TEXT[voice.status]}
        </p>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="-mr-1 flex h-6 w-6 items-center justify-center rounded-full text-neutral-500 hover:bg-white/10 hover:text-white"
        >
          <X size={14} />
        </button>
      </div>

      {voice.error && (
        <p className="mt-3 rounded-lg bg-red-500/10 p-2.5 text-xs leading-relaxed text-red-300">
          {voice.error}
        </p>
      )}

      <div className="mt-3">
        <p className="mb-1.5 text-xs text-neutral-500">Microphone</p>
        <LevelBar level={voice.level} />
      </div>

      <label className="mt-3 flex cursor-pointer items-center justify-between gap-3">
        <span>
          <span className="text-neutral-200">Noise filter</span>
          <span className="block text-xs text-neutral-500">
            Try it on and off to see which hears you better
          </span>
        </span>
        <input
          type="checkbox"
          checked={settings.noiseFilter}
          onChange={(e) => onChangeSettings({ ...settings, noiseFilter: e.target.checked })}
          className="h-4 w-4 accent-emerald-400"
        />
      </label>

      <div className="mt-4 flex items-baseline justify-between">
        <p className="text-xs text-neutral-500">Heard</p>
        <p className="text-xs text-neutral-500 tabular-nums">
          {voice.counts.ran} used · {voice.counts.ignored} ignored
        </p>
      </div>
      <ul className="mt-1.5 space-y-1">
        {voice.log.length === 0 && (
          <li className="text-xs text-neutral-600">Nothing yet. Try saying “next”.</li>
        )}
        {voice.log.slice(0, SHOWN_ENTRIES).map((entry) => (
          <li key={entry.id} className="flex items-baseline gap-2 text-xs">
            <span className="text-neutral-600 tabular-nums">{clock(entry.at)}</span>
            <span className="truncate text-neutral-200">“{entry.text}”</span>
            <span className="ml-auto shrink-0">
              <Outcome entry={entry} />
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-xs leading-relaxed text-neutral-500">
        Say each command on its own. Sound is processed on this Mac and is never saved or sent
        anywhere.
      </p>
    </motion.div>
  )
}
