import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import Splash from './components/Splash'
import Library from './components/Library'
import Reader from './components/Reader'

type Screen = { name: 'splash' } | { name: 'library' } | { name: 'reader'; book: Book }

const isMac = window.electron.process.platform === 'darwin'

function App(): React.JSX.Element {
  const [screen, setScreen] = useState<Screen>({ name: 'splash' })
  const [books, setBooks] = useState<Book[] | null>(null)

  // Load the library while the splash is showing, and refresh it whenever
  // you come back to the window (e.g. after adding PDFs in Finder)
  useEffect(() => {
    const refresh = (): void => {
      window.api
        .listBooks()
        .then(setBooks)
        .catch(() => setBooks([]))
    }
    refresh()
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [])

  const finishSplash = useCallback(() => {
    setScreen((current) => (current.name === 'splash' ? { name: 'library' } : current))
  }, [])
  const openBook = useCallback((book: Book) => setScreen({ name: 'reader', book }), [])
  const closeBook = useCallback(() => setScreen({ name: 'library' }), [])
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
    </div>
  )
}

export default App
