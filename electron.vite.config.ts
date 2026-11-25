import { readFileSync, readdirSync } from 'fs'
import { join, resolve } from 'path'
import { defineConfig } from 'electron-vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The open-source packages that end up inside Lectern (not the tools that only build it).
// Their licences are shown in Settings → About. If the app starts using another package, add it here.
const BUNDLED_PACKAGES = [
  '@electron-toolkit/utils',
  '@fontsource-variable/inter',
  '@fontsource-variable/literata',
  '@lichess-org/vosk-browser',
  'framer-motion',
  'lucide-react',
  'motion',
  'motion-dom',
  'motion-utils',
  'pdfjs-dist',
  'react',
  'react-dom',
  'scheduler',
  'tailwindcss'
]

type Licence = { name: string; version: string; licence: string; text: string }

// A package's own licence file (LICENSE, LICENCE.md…), if it has one
function licenceFile(dir: string): string | null {
  const file = readdirSync(dir).find((name) => /^licen[cs]e/i.test(name))
  return file ? readFileSync(join(dir, file), 'utf8').trim() : null
}

function collectLicences(): Licence[] {
  // The full Apache 2.0 licence, for things under it that don't come with a copy
  const apache = licenceFile(resolve('node_modules/pdfjs-dist')) ?? ''

  const packages = BUNDLED_PACKAGES.map((name) => {
    const dir = resolve('node_modules', name)
    const info = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
    const text = licenceFile(dir) ?? (info.license === 'Apache-2.0' ? apache : '')
    return { name, version: info.version, licence: info.license, text }
  })

  // The speech model for voice commands (downloaded by scripts/voice-model.sh)
  const voiceModel = {
    name: 'Vosk small US English model',
    version: '0.15',
    licence: 'Apache-2.0',
    text: `Copyright 2020 Alpha Cephei Inc\n\n${apache}`
  }
  return [...packages, voiceModel]
}

// Lets the app `import('virtual:licences')` to get the list above. "Virtual" because there's no
// such file: the licences are read from node_modules while the app is built.
function licences(): Plugin {
  const id = 'virtual:licences'
  return {
    name: 'lectern-licences',
    resolveId: (source) => (source === id ? `\0${id}` : null),
    load: (module) =>
      module === `\0${id}` ? `export default ${JSON.stringify(collectLicences())}` : null
  }
}

export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react(), tailwindcss(), licences()]
  }
})
