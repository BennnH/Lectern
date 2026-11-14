import { useEffect, useEffectEvent, useRef, useState, type RefObject } from 'react'
import { VOICE_PHRASES, type CommandActions, type CommandId } from '../commands'
import { VoiceError, VoiceListener, unloadVoice, type VoiceProblem } from './listener'
import { CONFIRM_WINDOW_MS, EMPTY_MEMORY, decide, remember, type VoiceDecision } from './rules'

// Voice commands for a screen: while `enabled`, listens to the microphone and runs the
// matching command from `actions` (the same actions the keyboard uses).

export type VoiceStatus = 'off' | 'starting' | 'listening' | 'error'

export type VoiceLogEntry = {
  id: number
  at: number // when it was heard (ms)
  text: string // what the recogniser heard
  decision: VoiceDecision
}

export type VoiceState = {
  status: VoiceStatus
  error: string | null
  log: VoiceLogEntry[] // newest first
  counts: { ran: number; ignored: number }
  pending: { id: CommandId; at: number } | null // a strict command waiting to be said again
  level: RefObject<number> // live microphone loudness, 0 to 1 (read it in a timer, not while drawing)
}

type Options = {
  enabled: boolean
  noiseFilter: boolean
  actions: CommandActions
}

const LOG_LENGTH = 30

const PROBLEM_TEXT: Record<VoiceProblem, string> = {
  'model-missing':
    'The speech model isn’t installed. Run “npm run voice-model”, then turn voice on again.',
  'mic-blocked':
    'Lectern isn’t allowed to use the microphone. Turn it on in System Settings → Privacy & Security → Microphone.',
  'no-mic': 'No microphone was found.',
  failed: 'Voice commands couldn’t start.'
}

function describe(error: unknown): string {
  if (error instanceof VoiceError) {
    const extra =
      error.problem === 'failed' && error.message !== 'failed' ? ` (${error.message})` : ''
    return PROBLEM_TEXT[error.problem] + extra
  }
  return `${PROBLEM_TEXT.failed} (${String(error)})`
}

export function useVoiceCommands({ enabled, noiseFilter, actions }: Options): VoiceState {
  // null while starting, then whether it worked
  const [outcome, setOutcome] = useState<{ ok: true } | { ok: false; error: string } | null>(null)
  const [log, setLog] = useState<VoiceLogEntry[]>([])
  const [counts, setCounts] = useState({ ran: 0, ignored: 0 })
  const [pending, setPending] = useState<VoiceState['pending']>(null)
  const level = useRef(0)
  const memory = useRef(EMPTY_MEMORY)
  const nextLogId = useRef(1)

  // Called for every result. As an effect event it always uses the latest actions,
  // without restarting the microphone each time they change.
  const onHeard = useEffectEvent((text: string) => {
    const now = Date.now()
    const decision = decide(text, now, memory.current)
    memory.current = remember(memory.current, decision, now)

    if (decision.kind === 'run') {
      actions[decision.id]?.()
      setPending(null)
    } else if (decision.kind === 'confirm') {
      setPending({ id: decision.id, at: now })
    }
    setCounts((c) =>
      decision.kind === 'ignore' ? { ...c, ignored: c.ignored + 1 } : { ...c, ran: c.ran + 1 }
    )
    setLog((entries) =>
      [{ id: nextLogId.current++, at: now, text, decision }, ...entries].slice(0, LOG_LENGTH)
    )
  })

  // Start listening when enabled; stop (and release the microphone) when not
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    let listener: VoiceListener | null = null

    VoiceListener.start({
      phrases: VOICE_PHRASES,
      noiseFilter,
      onHeard: (text) => onHeard(text),
      onLevel: (value) => {
        level.current = value
      }
    })
      .then((started) => {
        if (cancelled) started.stop()
        else {
          listener = started
          setOutcome({ ok: true })
        }
      })
      .catch((error) => {
        if (!cancelled) setOutcome({ ok: false, error: describe(error) })
      })

    return () => {
      cancelled = true
      listener?.stop()
      level.current = 0
      memory.current = EMPTY_MEMORY
      setOutcome(null)
      setPending(null)
    }
  }, [enabled, noiseFilter])

  // A strict command not repeated in time is forgotten
  useEffect(() => {
    if (!pending) return
    const timer = window.setTimeout(() => setPending(null), CONFIRM_WINDOW_MS)
    return () => window.clearTimeout(timer)
  }, [pending])

  // Free the speech model's memory when this screen closes
  useEffect(() => {
    return () => unloadVoice()
  }, [])

  const status: VoiceStatus = !enabled
    ? 'off'
    : outcome === null
      ? 'starting'
      : outcome.ok
        ? 'listening'
        : 'error'

  return {
    status,
    error: outcome && !outcome.ok ? outcome.error : null,
    log,
    counts,
    pending,
    level
  }
}
