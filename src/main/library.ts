import { app, ipcMain, shell } from 'electron'
import { mkdir, readdir, readFile, stat } from 'fs/promises'
import { basename, extname, join } from 'path'

// A PDF in the library folder. The id is just the file name.
export type BookFile = {
  id: string
  title: string
  size: number
  modified: number
}

// ~/Documents/Lectern — created automatically if it doesn't exist
export function getLibraryDir(): string {
  return join(app.getPath('documents'), 'Lectern')
}

async function listBooks(): Promise<BookFile[]> {
  const dir = getLibraryDir()
  await mkdir(dir, { recursive: true })

  const entries = await readdir(dir, { withFileTypes: true })
  const books: BookFile[] = []

  for (const entry of entries) {
    if (!entry.isFile() || extname(entry.name).toLowerCase() !== '.pdf') continue
    const info = await stat(join(dir, entry.name))
    books.push({
      id: entry.name,
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
  const dir = getLibraryDir()
  await mkdir(dir, { recursive: true })
  return shell.openPath(dir)
}

export function registerLibraryHandlers(): void {
  ipcMain.handle('library:list', () => listBooks())
  ipcMain.handle('library:read', (_event, id: string) => readBook(id))
  ipcMain.handle('library:open-folder', () => openLibraryFolder())
}
