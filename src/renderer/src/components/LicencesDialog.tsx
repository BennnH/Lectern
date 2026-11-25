import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { ChevronRight, X } from 'lucide-react'
import { EASE_OUT } from '../lib/motion'

type Licence = { name: string; version: string; licence: string; text: string }

// The open-source projects Lectern is built with, and their licences (Settings → About)
export default function LicencesDialog({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [licences, setLicences] = useState<Licence[] | null>(null)

  // Only loaded when you open this, as the licence texts are long
  useEffect(() => {
    import('virtual:licences').then((module) => setLicences(module.default))
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <motion.div
      className="app-no-drag fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="licences-title"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 6, scale: 0.98 }}
        transition={{ duration: 0.3, ease: EASE_OUT }}
        className="flex max-h-[80vh] w-[560px] max-w-[92vw] flex-col rounded-2xl bg-neutral-900/95 shadow-2xl ring-1 shadow-black/50 ring-white/10"
      >
        <header className="flex items-start justify-between gap-4 p-6 pb-4">
          <div>
            <h2 id="licences-title" className="text-lg font-semibold text-neutral-100">
              Open-source licences
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-neutral-400">
              Lectern is built with these open-source projects. Click one to read its licence.
            </p>
          </div>
          <button
            type="button"
            autoFocus
            onClick={onClose}
            aria-label="Close"
            className="-mt-1 -mr-2 rounded-full p-2 text-neutral-400 transition hover:bg-white/10 hover:text-white"
          >
            <X size={16} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto border-y border-white/5 px-3 py-2">
          {licences?.map((item) => (
            <details key={item.name} className="group">
              <summary className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-white/5">
                <ChevronRight
                  size={14}
                  className="shrink-0 text-neutral-500 transition-transform group-open:rotate-90"
                />
                <span className="text-neutral-200">{item.name}</span>
                <span className="text-neutral-500 tabular-nums">{item.version}</span>
                <span className="ml-auto text-xs text-neutral-500">{item.licence}</span>
              </summary>
              <pre className="mx-3 mt-1 mb-3 max-h-72 overflow-y-auto rounded-lg bg-black/30 p-4 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-neutral-400">
                {item.text}
              </pre>
            </details>
          ))}
        </div>

        <p className="p-6 pt-4 text-xs leading-relaxed text-neutral-500">
          Lectern runs on Electron, which includes Chromium. Their licences are inside the app, in
          Lectern.app/Contents/Resources.
        </p>
      </motion.div>
    </motion.div>
  )
}
