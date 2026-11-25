import { useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { PAGES, type PageId } from '../lib/pages'
import Sidebar from './Sidebar'
import Library from './Library'
import StatsPage from './StatsPage'
import SettingsPage from './SettingsPage'
import DataPage from './DataPage'

type Props = {
  page: PageId
  onNavigate: (page: PageId) => void
  books: Book[] | null
  folder: LibraryFolder | null
  onOpenBook: (book: Book) => void
  onOpenFolder: () => void
  onLibraryChange: () => void // after choosing another library folder
}

// Everything outside the reader: the sidebar, and whichever page is chosen in it
export default function Home({
  page,
  onNavigate,
  books,
  folder,
  onOpenBook,
  onOpenFolder,
  onLibraryChange
}: Props): React.JSX.Element {
  // ⌘1, ⌘2… (Ctrl on Windows) jump straight to a page
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return
      const target = PAGES[Number(e.key) - 1]
      if (!target) return
      e.preventDefault()
      onNavigate(target.id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onNavigate])

  return (
    <motion.div
      className="absolute inset-0 flex"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Sidebar page={page} onNavigate={onNavigate} />
      <main className="relative flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {page === 'library' && (
            <Library
              key="library"
              books={books}
              folder={folder}
              onOpen={onOpenBook}
              onOpenFolder={onOpenFolder}
              onOpenSettings={() => onNavigate('settings')}
              onBooksAdded={onLibraryChange}
            />
          )}
          {page === 'stats' && <StatsPage key="stats" />}
          {page === 'settings' && <SettingsPage key="settings" onLibraryChange={onLibraryChange} />}
          {page === 'data' && <DataPage key="data" />}
        </AnimatePresence>
      </main>
    </motion.div>
  )
}
