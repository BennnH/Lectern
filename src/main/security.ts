import { session } from 'electron'

// Lectern works entirely offline. This makes that a rule rather than a promise:
// - every request that would leave the computer is blocked
// - the page may use the microphone (for voice commands) and nothing else: no camera,
//   location, notifications and so on

// Addresses that stay on this computer
const LOCAL_PROTOCOLS = new Set(['file:', 'lectern:', 'data:', 'blob:', 'devtools:', 'chrome:'])

// `devServerUrl` is the local development server, which only exists during `npm run dev`
export function lockDownSession(devServerUrl?: string): void {
  const devHost = devServerUrl ? new URL(devServerUrl).host : null

  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    const url = new URL(details.url)
    const allowed = LOCAL_PROTOCOLS.has(url.protocol) || (devHost !== null && url.host === devHost)
    if (!allowed) console.warn(`Blocked a network request to ${url.origin}`)
    callback({ cancel: !allowed })
  })

  // Asked when the page wants a permission (e.g. getUserMedia for the microphone)
  session.defaultSession.setPermissionRequestHandler((_contents, permission, callback, details) => {
    const mediaTypes = 'mediaTypes' in details ? (details.mediaTypes ?? []) : []
    callback(
      permission === 'media' && mediaTypes.length > 0 && mediaTypes.every((t) => t === 'audio')
    )
  })

  // Asked when the page checks whether it already has a permission
  session.defaultSession.setPermissionCheckHandler((_contents, permission, _origin, details) => {
    return permission === 'media' && details.mediaType !== 'video'
  })
}
