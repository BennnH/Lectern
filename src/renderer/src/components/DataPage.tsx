import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { FileBraces, FileSpreadsheet, FolderOpen } from 'lucide-react'
import { clearData, dataSummary } from '../lib/store'
import { formatDuration } from '../lib/stats'
import ConfirmDialog from './ConfirmDialog'
import { PageLayout, Section, Stat } from './Page'

const isMac = window.api.platform === 'darwin'

// What each "clear" button deletes, shown in its confirmation
const CLEAR_OPTIONS: Record<DataClearScope, { title: string; details: string; confirm: string }> = {
  stats: {
    title: 'Clear reading stats?',
    details:
      'This deletes every reading session: your reading time, pages read, streaks and pace. Your place in each book is kept.',
    confirm: 'Clear stats'
  },
  all: {
    title: 'Delete all data?',
    details:
      'This deletes every reading session and your place in every book. Your PDF files and settings are not affected.',
    confirm: 'Delete everything'
  }
}

// How long a message like "Saved to …" stays on screen
const NOTICE_MS = 5000

function SecondaryButton({
  icon: Icon,
  children,
  onClick
}: {
  icon: typeof FolderOpen
  children: React.ReactNode
  onClick: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-1.5 text-sm text-neutral-300 transition hover:bg-white/5 hover:text-white"
    >
      <Icon size={15} />
      {children}
    </button>
  )
}

// See what Lectern has saved, export a copy, or delete it
export default function DataPage(): React.JSX.Element {
  const [location, setLocation] = useState('')
  const [summary, setSummary] = useState(dataSummary)
  const [confirming, setConfirming] = useState<DataClearScope | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    window.api.dataLocation().then(setLocation)
  }, [])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), NOTICE_MS)
    return () => window.clearTimeout(timer)
  }, [notice])

  const exportAs = async (format: DataExportFormat): Promise<void> => {
    const savedTo = await window.api.exportData(format)
    if (savedTo) setNotice(`Saved to ${savedTo}`)
  }

  const clear = async (scope: DataClearScope): Promise<void> => {
    await clearData(scope)
    setSummary(dataSummary())
    setConfirming(null)
    setNotice(scope === 'all' ? 'All data deleted' : 'Reading stats cleared')
  }

  return (
    <PageLayout title="Data" subtitle="Everything Lectern has recorded about your reading">
      <Section title={`Stored on this ${isMac ? 'Mac' : 'computer'}`}>
        <div className="rounded-2xl bg-white/[0.03] p-5 ring-1 ring-white/5">
          <div className="grid grid-cols-3 gap-4">
            <Stat value={String(summary.sessions)} label="reading sessions" />
            <Stat value={String(summary.books)} label="books with progress" />
            <Stat
              value={summary.activeMs > 0 ? formatDuration(summary.activeMs) : '0 min'}
              label="time read"
            />
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-4">
            <p className="min-w-0 truncate font-mono text-xs text-neutral-500" title={location}>
              {location}
            </p>
            <SecondaryButton icon={FolderOpen} onClick={() => window.api.showDataFile()}>
              Show in {isMac ? 'Finder' : 'folder'}
            </SecondaryButton>
          </div>
        </div>
        <p className="mt-3 text-xs text-neutral-500">
          Your data never leaves this {isMac ? 'Mac' : 'computer'} unless you export it.
        </p>
      </Section>

      <Section
        title="Export"
        description="Save a copy, as a backup or to explore in a spreadsheet."
      >
        <div className="flex flex-wrap gap-2">
          <SecondaryButton icon={FileBraces} onClick={() => exportAs('json')}>
            Everything (JSON)
          </SecondaryButton>
          <SecondaryButton icon={FileSpreadsheet} onClick={() => exportAs('csv')}>
            Reading sessions (CSV)
          </SecondaryButton>
        </div>
      </Section>

      <Section title="Clear data" danger>
        <div className="divide-y divide-white/5 rounded-2xl ring-1 ring-red-500/20">
          {(['stats', 'all'] as const).map((scope) => (
            <div key={scope} className="flex items-center justify-between gap-6 p-5">
              <div>
                <p className="text-sm text-neutral-200">
                  {scope === 'stats' ? 'Clear reading stats' : 'Delete all data'}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-neutral-500">
                  {CLEAR_OPTIONS[scope].details}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirming(scope)}
                className="shrink-0 rounded-full border border-red-500/40 px-4 py-1.5 text-sm text-red-300 transition hover:bg-red-500/10"
              >
                {scope === 'stats' ? 'Clear stats' : 'Delete all'}
              </button>
            </div>
          ))}
        </div>
      </Section>

      {/* Drawn at the top level of the page, so they cover the whole window */}
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
          {confirming && (
            <ConfirmDialog
              key="confirm"
              title={CLEAR_OPTIONS[confirming].title}
              details={CLEAR_OPTIONS[confirming].details}
              confirmLabel={CLEAR_OPTIONS[confirming].confirm}
              onConfirm={() => clear(confirming)}
              onCancel={() => setConfirming(null)}
            />
          )}
        </AnimatePresence>,
        document.body
      )}
    </PageLayout>
  )
}
