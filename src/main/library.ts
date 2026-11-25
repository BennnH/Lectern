import { BrowserWindow, app, dialog, ipcMain, shell } from 'electron'
import { createHash } from 'crypto'
import { mkdir, open, readdir, readFile, stat } from 'fs/promises'
import { basename, extname, join } from 'path'
import { getLibraryFolder, setLibraryFolder } from './settings'

// A PDF in the library folder. The id is the file name; the fingerprint identifies the
// book by its contents, so renaming the file doesn't lose your progress or stats.
export type BookFile = {
  id: string
  fingerprint: string
  title: string
  size: number
  modified: number
}

// ~/Documents/Lectern — created automatically if it doesn't exist
function defaultLibraryDir(): string {
  return join(app.getPath('documents'), 'Lectern')
}

// Where your PDFs are: the folder you chose in Settings, or the default
export function getLibraryDir(): string {
  return getLibraryFolder() ?? defaultLibraryDir()
}

async function isFolder(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory()
  } catch {
    return false
  }
}

// Where the library is, for Settings and the Library page. Only the default folder is created
// for you: a folder you chose that's gone missing (say, on a drive that's unplugged) shouldn't
// be quietly replaced with an empty one.
async function libraryFolder(): Promise<LibraryFolder> {
  const path = getLibraryDir()
  const isDefault = getLibraryFolder() === null
  if (isDefault) await mkdir(path, { recursive: true })
  const home = app.getPath('home')
  return {
    path,
    shortPath: path.startsWith(home) ? `~${path.slice(home.length)}` : path,
    isDefault,
    found: await isFolder(path)
  }
}

// Shows the macOS folder picker. Returns the new folder, or null if you cancel.
async function chooseLibraryFolder(window: BrowserWindow | null): Promise<LibraryFolder | null> {
  const options: Electron.OpenDialogOptions = {
    title: 'Choose your library folder',
    message: 'Lectern shows the PDFs in the folder you choose.',
    buttonLabel: 'Use This Folder',
    defaultPath: getLibraryDir(),
    properties: ['openDirectory', 'createDirectory']
  }
  const result = window
    ? await dialog.showOpenDialog(window, options)
    : await dialog.showOpenDialog(options)
  const chosen = result.filePaths[0]
  if (result.canceled || !chosen) return null
  setLibraryFolder(chosen === defaultLibraryDir() ? null : chosen)
  return libraryFolder()
}

const CHUNK = 64 * 1024
const fingerprints = new Map<string, string>()

// A short ID made from the file's size plus its first and last 64 KB
async function fingerprint(path: string, size: number, modified: number): Promise<string> {
  const cacheKey = `${path}|${size}|${modified}`
  const cached = fingerprints.get(cacheKey)
  if (cached) return cached

  const file = await open(path, 'r')
  try {
    const hash = createHash('sha1').update(String(size))
    const head = Buffer.alloc(Math.min(CHUNK, size))
    await file.read(head, 0, head.length, 0)
    hash.update(head)
    if (size > CHUNK) {
      const tail = Buffer.alloc(Math.min(CHUNK, size - CHUNK))
      await file.read(tail, 0, tail.length, size - tail.length)
      hash.update(tail)
    }
    const result = hash.digest('hex').slice(0, 16)
    fingerprints.set(cacheKey, result)
    return result
  } finally {
    await file.close()
  }
}

async function listBooks(): Promise<BookFile[]> {
  const { path: dir, found } = await libraryFolder()
  if (!found) return []

  const entries = await readdir(dir, { withFileTypes: true })
  const books: BookFile[] = []

  for (const entry of entries) {
    if (!entry.isFile() || extname(entry.name).toLowerCase() !== '.pdf') continue
    const path = join(dir, entry.name)
    const info = await stat(path)
    books.push({
      id: entry.name,
      fingerprint: await fingerprint(path, info.size, info.mtimeMs),
      title: basename(entry.name, extname(entry.name)).replace(/_+/g, ' '),
      size: info.size,
      modified: info.mtimeMs
    })
  }

  books.sort((a, b) => a.title.localeCompare(b.title))
  return books
}

async function readBook(id: string): Promise<Uint8Array> {
  // basename() strips any folders, so only files inside the library can be read
  const path = join(getLibraryDir(), basename(id))
  return new Uint8Array(await readFile(path))
}

async function openLibraryFolder(): Promise<string> {
  const { path } = await libraryFolder()
  return shell.openPath(path)
}

export function registerLibraryHandlers(): void {
  ipcMain.handle('library:list', () => listBooks())
  ipcMain.handle('library:read', (_event, id: string) => readBook(id))
  ipcMain.handle('library:open-folder', () => openLibraryFolder())
  ipcMain.handle('library:folder', () => libraryFolder())
  ipcMain.handle('library:choose-folder', (event) =>
    chooseLibraryFolder(BrowserWindow.fromWebContents(event.sender))
  )
  ipcMain.handle('library:use-default-folder', () => {
    setLibraryFolder(null)
    return libraryFolder()
  })
}
