import { motion } from 'motion/react'
import { Flame } from 'lucide-react'
import BookCard from './BookCard'
import { getSessions } from '../lib/store'
import { currentStreak, formatDuration, todayTotals } from '../lib/stats'

type Props = {
  books: Book[] | null
  onOpen: (book: Book) => void
  onOpenFolder: () => void
}

export default function Library({ books, onOpen, onOpenFolder }: Props): React.JSX.Element {
  // Today's reading and your streak, shown under the title
  const sessions = getSessions()
  const today = todayTotals(sessions)
  const streak = currentStreak(sessions)

  return (
    <motion.div
      className="absolute inset-0 overflow-y-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
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
          <button
            type="button"
            onClick={onOpenFolder}
            className="rounded-full border border-white/10 px-4 py-1.5 text-sm text-neutral-300 transition hover:bg-white/5 hover:text-white"
          >
            Open folder
          </button>
        </header>

        {books && books.length === 0 && (
          <div className="mt-24 flex flex-col items-center text-center">
            <p className="text-lg font-medium text-neutral-200">Your library is empty</p>
            <p className="mt-2 max-w-sm text-sm text-neutral-500">
              Add PDF files to the Lectern folder in your Documents and they&apos;ll appear here.
            </p>
            <button
              type="button"
              onClick={onOpenFolder}
              className="mt-6 rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
            >
              Open Lectern folder
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
    </motion.div>
  )
}
