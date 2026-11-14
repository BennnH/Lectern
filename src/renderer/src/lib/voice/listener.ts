import { VoskClient, type KaldiRecognizer } from '@lichess-org/vosk-browser'
import voskWorkerUrl from '@lichess-org/vosk-browser/dist/vosk.worker.js?url'
import voskWasmUrl from '@lichess-org/vosk-browser/dist/vosk.wasm?url'
import captureWorkletUrl from './captureWorklet.ts?worker&url'

// Listens to the microphone and reports each phrase the recogniser hears.
//
// How the sound flows:
//   microphone → browser clean-up (noise filter, echo cancelling, auto volume)
//   → audio thread (captureWorklet.ts, 100 ms chunks)
//   → Vosk speech recogniser (a WebAssembly build of Vosk, in a background worker)
//   → onHeard("next")
// Everything happens on this computer. Sound is never saved or sent anywhere.

// Vosk works at 16,000 samples a second, so the browser converts the microphone to that
const SAMPLE_RATE = 16_000
// How long to wait for the speech model to load before giving up
const LOAD_TIMEOUT_MS = 60_000

export type VoiceProblem = 'model-missing' | 'mic-blocked' | 'no-mic' | 'failed'

export class VoiceError extends Error {
  constructor(
    readonly problem: VoiceProblem,
    detail = ''
  ) {
    super(detail || problem)
  }
}

export type ListenerOptions = {
  phrases: string[] // the only phrases to listen for
  noiseFilter: boolean
  onHeard: (text: string) => void // one complete result, e.g. "next" or "[unk]"
  onLevel: (level: number) => void // microphone loudness, 0 to 1, ten times a second
}

// ---------------------------------------------------------------------------------------
// The speech model (about 70 MB once unpacked) is loaded once and kept until unloadVoice().
// The first load unpacks it into the app's own storage, so later loads are quicker.

let engine: Promise<VoskClient> | null = null

function loadEngine(modelUrl: string): Promise<VoskClient> {
  engine ??= new Promise<VoskClient>((resolve, reject) => {
    const client = new VoskClient({
      modelUrl,
      workerUrl: voskWorkerUrl,
      wasmUrl: voskWasmUrl,
      logLevel: -1 // errors only
    })
    const timer = window.setTimeout(
      () => reject(new VoiceError('failed', 'The speech model took too long to load')),
      LOAD_TIMEOUT_MS
    )
    client.on('load', (message) => {
      window.clearTimeout(timer)
      if (message.event === 'load' && message.result) resolve(client)
      else reject(new VoiceError('failed', 'The speech model could not be loaded'))
    })
    client.on('error', (message) => {
      window.clearTimeout(timer)
      reject(new VoiceError('failed', message.event === 'error' ? message.error : ''))
    })
  }).catch((error) => {
    engine = null // try again from scratch next time
    throw error
  })
  return engine
}

// Frees the memory the speech model uses (it loads again next time voice is turned on)
export function unloadVoice(): void {
  engine?.then((client) => client.terminate()).catch(() => undefined)
  engine = null
}

// ---------------------------------------------------------------------------------------

export class VoiceListener {
  private constructor(
    private readonly stream: MediaStream,
    private readonly audio: AudioContext,
    private readonly recogniser: KaldiRecognizer
  ) {}

  // Loads the model if needed, asks for the microphone, and starts listening
  static async start(options: ListenerOptions): Promise<VoiceListener> {
    const model = await window.api.voiceModel()
    if (!model.available) throw new VoiceError('model-missing')
    if ((await window.api.microphoneAccess()) !== 'granted') throw new VoiceError('mic-blocked')

    const client = await loadEngine(model.url)

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          noiseSuppression: options.noiseFilter,
          echoCancellation: true,
          autoGainControl: true
        },
        video: false
      })
    } catch (error) {
      const name = error instanceof DOMException ? error.name : ''
      if (name === 'NotFoundError') throw new VoiceError('no-mic')
      if (name === 'NotAllowedError') throw new VoiceError('mic-blocked')
      throw new VoiceError('failed', String(error))
    }

    const audio = new AudioContext({ sampleRate: SAMPLE_RATE })
    try {
      await audio.audioWorklet.addModule(captureWorkletUrl)

      // Restricting the recogniser to our phrases makes it far more accurate.
      // "[unk]" lets it say "that wasn't one of them" instead of forcing a match.
      const recogniser = new client.KaldiRecognizer(
        audio.sampleRate,
        JSON.stringify([...options.phrases, '[unk]'])
      )
      recogniser.on('result', (message) => {
        if (message.event === 'result' && message.result.text) options.onHeard(message.result.text)
      })

      // No outputs: the sound is only listened to, never played back
      const capture = new AudioWorkletNode(audio, 'lectern-capture', { numberOfOutputs: 0 })
      capture.port.onmessage = (event: MessageEvent<Float32Array>) => {
        options.onLevel(loudness(event.data))
        recogniser.acceptWaveformFloat(event.data, audio.sampleRate)
      }
      audio.createMediaStreamSource(stream).connect(capture)

      return new VoiceListener(stream, audio, recogniser)
    } catch (error) {
      stream.getTracks().forEach((track) => track.stop())
      audio.close()
      throw error instanceof VoiceError ? error : new VoiceError('failed', String(error))
    }
  }

  // Stops listening and releases the microphone (the Mac's mic indicator turns off)
  stop(): void {
    this.stream.getTracks().forEach((track) => track.stop())
    this.audio.close()
    this.recogniser.remove()
  }
}

// Rough loudness of a chunk, from 0 (silence) to 1 (very loud), for the level meter
function loudness(samples: Float32Array): number {
  let sum = 0
  for (const sample of samples) sum += sample * sample
  const decibels = 10 * Math.log10(sum / samples.length + 1e-10)
  return Math.min(1, Math.max(0, (decibels + 60) / 50)) // -60 dB → 0, -10 dB → 1
}
