import { VOICE_PHRASES, commandForPhrase, getCommand, type CommandId } from '../commands'

// Decides whether something the recogniser heard should run a command.
// Kept separate from the audio code so the rules are easy to read, test and tweak.

// Ignore a second command this soon after the last one (stops accidental doubles)
export const COOLDOWN_MS = 500
// A strict command must be said again within this time to run
export const CONFIRM_WINDOW_MS = 4000

// What the rules remember between results
export type VoiceMemory = {
  lastRunAt: number
  // A strict command heard once, waiting to be said again
  pending: { id: CommandId; at: number } | null
}

export const EMPTY_MEMORY: VoiceMemory = { lastRunAt: 0, pending: null }

export type VoiceDecision =
  | { kind: 'run'; id: CommandId }
  | { kind: 'confirm'; id: CommandId } // strict command heard once: say it again to run it
  | { kind: 'ignore'; reason: string }

// `text` is one complete result from the recogniser, e.g. "next", "[unk]" or "[unk] next".
// "[unk]" is how the recogniser marks speech or sounds that aren't one of our phrases.
export function decide(text: string, now: number, memory: VoiceMemory): VoiceDecision {
  const phrase = text.trim()
  if (phrase === '[unk]') return { kind: 'ignore', reason: 'Not a command' }

  // Only a command said on its own counts, so "I'll be back next week" does nothing
  const id = commandForPhrase(phrase)
  if (!id) {
    // e.g. "back" on its own, when the command is "go back"
    const fullPhrase = VOICE_PHRASES.find((p) => p.split(' ').includes(phrase))
    return {
      kind: 'ignore',
      reason: fullPhrase ? `Part of “${fullPhrase}”` : 'Not said on its own'
    }
  }

  if (now - memory.lastRunAt < COOLDOWN_MS) {
    return { kind: 'ignore', reason: 'Too soon after the last command' }
  }

  if (getCommand(id).strict) {
    const confirmed = memory.pending?.id === id && now - memory.pending.at <= CONFIRM_WINDOW_MS
    return confirmed ? { kind: 'run', id } : { kind: 'confirm', id }
  }
  return { kind: 'run', id }
}

// The memory after a decision
export function remember(memory: VoiceMemory, decision: VoiceDecision, now: number): VoiceMemory {
  if (decision.kind === 'run') return { lastRunAt: now, pending: null }
  if (decision.kind === 'confirm') return { ...memory, pending: { id: decision.id, at: now } }
  return memory
}
