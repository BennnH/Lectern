/// <reference types="vite/client" />

// The licences of the open-source packages inside Lectern, read when the app is built
// (see electron.vite.config.ts)
declare module 'virtual:licences' {
  const licences: { name: string; version: string; licence: string; text: string }[]
  export default licences
}
