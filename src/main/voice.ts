import { app, ipcMain, protocol, systemPreferences } from 'electron'
import { createReadStream, existsSync, statSync } from 'fs'
import { join } from 'path'
import { Readable } from 'stream'

// The speech model for voice commands, and access to the microphone.
//
// The model file lives in resources/voice/ (`npm run voice-model` downloads it there).
// The voice engine in the window loads it from an internal lectern:// address that this
// file serves straight from disk, so nothing is downloaded from the internet at runtime.

const MODEL_FILE = 'vosk-model-small-en-us-0.15.tar.gz'
const MODEL_URL = `lectern://voice/${MODEL_FILE}`

function modelPath(): string {
  // In development resources/ sits next to package.json. In the built app it's unpacked
  // alongside app.asar (see asarUnpack in electron-builder.yml).
  return join(app.getAppPath(), 'resources', 'voice', MODEL_FILE).replace(
    'app.asar',
    'app.asar.unpacked'
  )
}

// Must be called before the app is ready
export function registerVoiceScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'lectern',
      privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true }
    }
  ])
}

export function registerVoiceHandlers(): void {
  // Serves the model file, and nothing else, at MODEL_URL
  protocol.handle('lectern', (request) => {
    const path = modelPath()
    if (request.url !== MODEL_URL || !existsSync(path)) {
      return new Response('Not found', { status: 404 })
    }
    const body = Readable.toWeb(createReadStream(path)) as ReadableStream
    return new Response(body, {
      headers: {
        'Content-Type': 'application/gzip',
        'Content-Length': String(statSync(path).size),
        'Access-Control-Allow-Origin': '*'
      }
    })
  })

  ipcMain.handle('voice:model', () => ({ url: MODEL_URL, available: existsSync(modelPath()) }))

  // macOS asks the person the first time; after that it remembers their answer
  ipcMain.handle('voice:microphone-access', async () => {
    if (process.platform !== 'darwin') return 'granted'
    const status = systemPreferences.getMediaAccessStatus('microphone')
    if (status === 'granted') return 'granted'
    if (status === 'not-determined') {
      return (await systemPreferences.askForMediaAccess('microphone')) ? 'granted' : 'denied'
    }
    return 'denied'
  })
}
