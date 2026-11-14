// Runs on the browser's audio thread. Collects microphone samples into 100 ms chunks and
// hands each chunk to the page, which passes it to the recogniser. Nothing is kept:
// each chunk is sent once and then the memory is reused.

// The audio thread has its own globals, which TypeScript's normal web types don't include
declare const sampleRate: number
declare function registerProcessor(name: string, processor: unknown): void
declare class AudioWorkletProcessor {
  readonly port: MessagePort
}

const CHUNK_SECONDS = 0.1

class CaptureProcessor extends AudioWorkletProcessor {
  private chunk = new Float32Array(Math.round(sampleRate * CHUNK_SECONDS))
  private filled = 0

  // Called by the browser with 128 new samples at a time
  process(inputs: Float32Array[][]): boolean {
    const samples = inputs[0]?.[0]
    if (!samples) return true

    let read = 0
    while (read < samples.length) {
      const count = Math.min(samples.length - read, this.chunk.length - this.filled)
      this.chunk.set(samples.subarray(read, read + count), this.filled)
      this.filled += count
      read += count
      if (this.filled === this.chunk.length) {
        this.port.postMessage(this.chunk)
        this.filled = 0
      }
    }
    return true // keep running
  }
}

registerProcessor('lectern-capture', CaptureProcessor)
