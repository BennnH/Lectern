import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { FilePlus, Flame } from 'lucide-react'
import BookCard from './BookCard'
import { getSessions } from '../lib/store'
import { currentStreak, formatDuration, todayTotals } from '../lib/stats'

type Props = {
  books: Book[] | null
  folder: LibraryFolder | null
  onOpen: (book: Book) => void
  onOpenFolder: () => void
  onOpenSettings: () => void
  onBooksAdded: () => void // the library needs listing again
}

// How long a message like "Added Night Train" stays on screen
const NOTICE_MS = 5000

// "Added Night Train", "Added 3 books · 1 file wasn't a PDF" and so on
function describe({ added, alreadyThere, notPdf }: AddBooksResult): string {
  const parts: string[] = []
  if (added.length === 1) parts.push(`Added ${added[0]}`)
  if (added.length > 1) parts.push(`Added ${added.length} books`)
  if (alreadyThere.length === 1) parts.push(`${alreadyThere[0]} is already in your library`)
  if (alreadyThere.length > 1) parts.push(`${alreadyThere.length} were already in your library`)
  if (notPdf === 1) parts.push("1 file wasn't a PDF")
  if (notPdf > 1) parts.push(`${notPdf} files weren't PDFs`)
  return parts.join(' · ')
}

// Whether something being dragged includes files (not, say, selected text)
function hasFiles(e: React.DragEvent): boolean {
  return e.dataTransfer.types.includes('Files')
}

export default function Library({
  books,
  folder,
  onOpen,
  onOpenFolder,
  onOpenSettings,
  onBooksAdded
}: Props): React.JSX.Element {
  // Today's reading and your streak, shown under the title
  const sessions = getSessions()
  const today = todayTotals(sessions)
  const streak = currentStreak(sessions)

  // Dropping PDFs here copies them into the library folder (not if it's missing)
  const canDrop = folder?.found !== false
  const [dragging, setDragging] = useState(false)
  // Drag events fire again for every element under the pointer, so count them to know
  // when the files have really left the page
  const dragDepth = useRef(0)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), NOTICE_MS)
    return () => window.clearTimeout(timer)
  }, [notice])

  const drop = async (e: React.DragEvent): Promise<void> => {
    e.preventDefault()
    dragDepth.current = 0
    setDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return
    const result = await window.api.addBooks(files)
    setNotice(describe(result))
    if (result.added.length > 0) onBooksAdded()
  }

  return (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      onDragEnter={(e) => {
        if (!canDrop || !hasFiles(e)) return
        dragDepth.current += 1
        setDragging(true)
      }}
      onDragOver={(e) => {
        if (!canDrop || !hasFiles(e)) return
        e.preventDefault() // allows the drop
        e.dataTransfer.dropEffect = 'copy'
      }}
      onDragLeave={() => {
        if (dragDepth.current === 0) return
        dragDepth.current -= 1
        if (dragDepth.current === 0) setDragging(false)
      }}
      onDrop={(e) => {
        if (canDrop && hasFiles(e)) drop(e)
      }}
    >
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-6xl px-10 pt-14 pb-16">
          <header className="mb-10 flex items-end justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Library</h1>
              {books && books.length > 0 && (
                <p className="mt-1 flex items-center gap-2 text-sm text-neutral-500">
                  <span>
                    {books.length} {books.length === 1 ? 'book' : 'books'}
                  </span>
                  {today && (
                    <span>
                      · Today {today.pages} {today.pages === 1 ? 'page' : 'pages'},{' '}
                      {formatDuration(today.activeMs)}
                    </span>
                  )}
                  {streak > 0 && (
                    <span className="flex items-center gap-1 text-amber-400/90">
                      · <Flame size={14} /> {streak}-day streak
                    </span>
                  )}
                </p>
              )}
            </div>
            {folder?.found !== false && (
              <button
                type="button"
                onClick={onOpenFolder}
                className="rounded-full border border-white/10 px-4 py-1.5 text-sm text-neutral-300 transition hover:bg-white/5 hover:text-white"
              >
                Open folder
              </button>
            )}
          </header>

          {books && books.length === 0 && folder && !folder.found && (
            <div className="mt-24 flex flex-col items-center text-center">
              <p className="text-lg font-medium text-neutral-200">
                Can&apos;t find your library folder
              </p>
              <p className="mt-2 max-w-sm text-sm text-neutral-500">
                <span className="text-neutral-400">{folder.shortPath}</span> isn&apos;t there any
                more. If it&apos;s on a drive, plug it back in, or choose another folder in
                Settings.
              </p>
              <button
                type="button"
                onClick={onOpenSettings}
                className="mt-6 rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
              >
                Open Settings
              </button>
            </div>
          )}

          {books && books.length === 0 && folder?.found !== false && (
            <div className="mt-24 flex flex-col items-center text-center">
              <p className="text-lg font-medium text-neutral-200">Your library is empty</p>
              <p className="mt-2 max-w-sm text-sm text-neutral-500">
                {folder && !folder.isDefault ? (
                  <>
                    Drag PDFs here, or add them to{' '}
                    <span className="text-neutral-400">{folder.shortPath}</span>, and they&apos;ll
                    appear here.
                  </>
                ) : (
                  <>
                    Drag PDFs here, or add them to the Lectern folder in your Documents, and
                    they&apos;ll appear here.
                  </>
                )}
              </p>
              <button
                type="button"
                onClick={onOpenFolder}
                className="mt-6 rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
              >
                Open library folder
              </button>
            </div>
          )}

          {books && books.length > 0 && (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] items-start gap-x-6 gap-y-10">
              {books.map((book, index) => (
                <BookCard key={book.id} book={book} index={index} onOpen={() => onOpen(book)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Shown while PDFs are dragged over the Library */}
      <AnimatePresence>
        {dragging && (
          <motion.div
            className="pointer-events-none absolute inset-4 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/25 bg-neutral-950/85 text-center backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <FilePlus size={28} className="text-neutral-300" />
            <p className="mt-3 font-medium text-neutral-100">
              Drop PDFs to add them to your library
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              They&apos;re copied into {folder?.shortPath ?? 'your library folder'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drawn at the top level of the page, so it sits above everything */}
      {createPortal(
        <AnimatePresence>
          {notice && (
            <motion.p
              key={notice}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="fixed bottom-6 left-1/2 z-[60] max-w-[80vw] -translate-x-1/2 truncate rounded-full bg-neutral-800 px-4 py-2 text-sm text-neutral-200 shadow-xl ring-1 ring-white/10"
            >
              {notice}
            </motion.p>
          )}
        </AnimatePresence>,
        document.body
      )}
    </motion.div>
  )
}
