import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { getCommand } from '../lib/commands'
import type { VoiceState } from '../lib/voice/useVoiceCommands'
import { LevelBars } from './VoiceLevel'

type Props = {
  voice: VoiceState
  controlsVisible: boolean
  onClick: () => void
}

const DOT_COLOUR = {
  off: 'bg-neutral-500',
  starting: 'bg-amber-400 animate-pulse',
  listening: 'bg-emerald-400',
  error: 'bg-red-400'
}

// How long a recognised command stays in the pill
const SHOW_HEARD_MS = 1500

// Top-right pill shown whenever voice is on, so it's always clear the mic is listening.
// Click it for the voice panel.
export default function VoiceIndicator({
  voice,
  controlsVisible,
  onClick
}: Props): React.JSX.Element {
  // Briefly show the command that was just run
  const latest = voice.log[0]
  const [fadedId, setFadedId] = useState<number | null>(null)
  useEffect(() => {
    if (!latest) return
    const timer = window.setTimeout(() => setFadedId(latest.id), SHOW_HEARD_MS)
    return () => window.clearTimeout(timer)
  }, [latest])
  const justRan = latest && latest.id !== fadedId && latest.decision.kind === 'run'

  let label = 'Listening'
  if (voice.status === 'starting') label = 'Starting voice…'
  else if (voice.status === 'error') label = 'Voice problem'
  else if (voice.pending) label = `Say “${getCommand(voice.pending.id).voice[0]}” again`
  else if (justRan) label = `“${latest.text}”`

  return (
    <motion.button
      type="button"
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()}
      title="Voice commands (click for details)"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: controlsVisible || voice.pending ? 1 : 0.55, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.25 }}
      className="app-no-drag absolute top-2 right-4 z-[60] flex items-center gap-2 rounded-full bg-neutral-900/85 px-3 py-1 text-sm text-neutral-300 ring-1 ring-white/10 backdrop-blur-md transition-colors hover:text-white"
    >
      <span className={`h-2 w-2 rounded-full ${DOT_COLOUR[voice.status]}`} />
      <span className={voice.pending ? 'text-amber-300' : justRan ? 'text-white' : ''}>
        {label}
      </span>
      {voice.status === 'listening' && <LevelBars level={voice.level} />}
    </motion.button>
  )
}
