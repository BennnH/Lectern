import { app, dialog, type BrowserWindow } from 'electron'
import { writeFileSync } from 'fs'
import { join } from 'path'

// Saving a copy of your reading data where you choose (Data page → Export).

const pad = (n: number): string => String(n).padStart(2, '0')

// 2026-11-14 (in local time)
function localDate(time: number): string {
  const d = new Date(time)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// 14:05 (in local time)
function localTime(time: number): string {
  const d = new Date(time)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// One spreadsheet cell. Text is quoted if it contains commas, quotes or line breaks, and
// text starting with = + - @ gets a leading ' so spreadsheet apps don't treat it as a formula.
function csvCell(value: string | number): string {
  let text = String(value)
  if (typeof value === 'string' && /^[=+\-@]/.test(text)) text = `'${text}`
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

// One row per reading session, for spreadsheets
export function sessionsToCsv(sessions: ReadingSession[]): string {
  const header = [
    'date',
    'start',
    'end',
    'minutes_read',
    'pages_read',
    'start_page',
    'end_page',
    'book_pages',
    'book'
  ]
  const rows = sessions.map((s) => [
    localDate(s.start),
    localTime(s.start),
    localTime(s.end),
    (s.activeMs / 60_000).toFixed(1),
    s.pagesRead,
    s.startPage,
    s.endPage,
    s.totalPages,
    s.title
  ])
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n') + '\n'
}

// Asks where to save, then writes the file. Returns where it was saved, or null if cancelled.
export async function exportData(
  window: BrowserWindow | null,
  data: StoredData,
  format: DataExportFormat
): Promise<string | null> {
  const stamp = localDate(Date.now())
  const isJson = format === 'json'
  const options = {
    title: 'Export reading data',
    defaultPath: join(
      app.getPath('downloads'),
      isJson ? `lectern-data-${stamp}.json` : `lectern-sessions-${stamp}.csv`
    ),
    filters: [
      isJson ? { name: 'JSON', extensions: ['json'] } : { name: 'CSV', extensions: ['csv'] }
    ]
  }
  const result = window
    ? await dialog.showSaveDialog(window, options)
    : await dialog.showSaveDialog(options)
  if (result.canceled || !result.filePath) return null

  writeFileSync(
    result.filePath,
    isJson ? JSON.stringify(data, null, 2) : sessionsToCsv(data.sessions)
  )
  return result.filePath
}
