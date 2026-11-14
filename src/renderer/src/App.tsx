import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import Splash from './components/Splash'
import Library from './components/Library'
import Reader from './components/Reader'
import SessionRecap from './components/SessionRecap'
import { getSessions, importOldProgress, loadStore, saveSession } from './lib/store'
import { isWorthKeeping } from './lib/stats'

type Screen = { name: 'splash' } | { name: 'library' } | { name: 'reader'; book: Book }

const isMac = window.electron.process.platform === 'darwin'

function App(): React.JSX.Element {
  const [screen, setScreen] = useState<Screen>({ name: 'splash' })
  const [books, setBooks] = useState<Book[] | null>(null)
  // The session to show a recap card for (when back in the library)
  const [recap, setRecap] = useState<ReadingSession | null>(null)

  // While the splash is showing: load your saved data, then the library. The library is
  // refreshed whenever you come back to the window (e.g. after adding PDFs in Finder).
  useEffect(() => {
    const refresh = (): void => {
      window.api
        .listBooks()
        .then((found) => {
          importOldProgress(found)
          setBooks(found)
        })
        .catch(() => setBooks([]))
    }
    loadStore()
      .catch(() => undefined)
      .then(() => {
        // If you quit while reading last time, show that session's recap now
        const unseen = getSessions().filter((s) => !s.seen && isWorthKeeping(s))
        if (unseen.length > 0) setRecap(unseen[unseen.length - 1])
        refresh()
      })
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [])

  const finishSplash = useCallback(() => {
    setScreen((current) => (current.name === 'splash' ? { name: 'library' } : current))
  }, [])
  const openBook = useCallback((book: Book) => setScreen({ name: 'reader', book }), [])
  const closeBook = useCallback((session: ReadingSession | null) => {
    setScreen({ name: 'library' })
    if (session) setRecap(session)
  }, [])

  // Closing the recap marks it (and any older unseen ones) as seen
  const dismissRecap = useCallback(() => {
    for (const session of getSessions()) {
      if (!session.seen) saveSession({ ...session, seen: true })
    }
    setRecap(null)
  }, [])
  const openFolder = useCallback(() => {
    window.api.openLibraryFolder()
  }, [])

  return (
    <div className="relative h-full overflow-hidden">
      {/* macOS: an invisible strip along the top so you can drag the window */}
      {isMac && <div className="app-drag fixed inset-x-0 top-0 z-50 h-10" />}

      <AnimatePresence mode="wait">
        {screen.name === 'splash' && <Splash key="splash" onDone={finishSplash} />}
        {screen.name === 'library' && (
          <Library key="library" books={books} onOpen={openBook} onOpenFolder={openFolder} />
        )}
        {screen.name === 'reader' && (
          <Reader key={`reader-${screen.book.id}`} book={screen.book} onClose={closeBook} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {recap && screen.name === 'library' && (
          <SessionRecap key={recap.id} session={recap} onDone={dismissRecap} />
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
