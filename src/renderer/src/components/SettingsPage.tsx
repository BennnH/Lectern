import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence } from 'motion/react'
import { ArrowUpRight, ScrollText } from 'lucide-react'
import appIcon from '../../../../resources/icon.png'
import LicencesDialog from './LicencesDialog'
import { PageLayout, Section } from './Page'

const isMac = window.api.platform === 'darwin'

const GITHUB_URL = 'https://github.com/BennnH/Lectern'

// The same rounded outline buttons as on the Data page
const BUTTON =
  'flex items-center gap-2 rounded-full border border-white/10 px-4 py-1.5 text-sm text-neutral-300 transition hover:bg-white/5 hover:text-white'

// Your preferences, and information about Lectern
export default function SettingsPage(): React.JSX.Element {
  const [version, setVersion] = useState('')
  const [showLicences, setShowLicences] = useState(false)

  useEffect(() => {
    window.api.appVersion().then(setVersion)
  }, [])

  return (
    <PageLayout title="Settings">
      <Section title="About">
        <div className="rounded-2xl bg-white/[0.03] p-5 ring-1 ring-white/5">
          <div className="flex items-center gap-4">
            <img src={appIcon} alt="" className="-m-1.5 h-16 w-16" />
            <div>
              <p className="font-serif text-xl tracking-tight text-neutral-100">Lectern</p>
              <p className="text-sm text-neutral-500 tabular-nums">
                {version && `Version ${version}`}
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-neutral-400">
            A PDF reader with offline voice commands for hands-free reading, plus reading stats.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/5 pt-4">
            {/* Opens in your browser (see setWindowOpenHandler in src/main/index.ts) */}
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className={BUTTON}>
              <ArrowUpRight size={15} />
              GitHub
            </a>
            <button type="button" onClick={() => setShowLicences(true)} className={BUTTON}>
              <ScrollText size={15} />
              Open-source licences
            </button>
            <p className="ml-auto text-xs text-neutral-500">© 2026 Ben Hardy · MIT licence</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-neutral-500">
          Lectern works offline. Your books, reading data and voice never leave this{' '}
          {isMac ? 'Mac' : 'computer'}.
        </p>
      </Section>

      {/* Drawn at the top level of the page, so it covers the whole window */}
      {createPortal(
        <AnimatePresence>
          {showLicences && <LicencesDialog key="licences" onClose={() => setShowLicences(false)} />}
        </AnimatePresence>,
        document.body
      )}
    </PageLayout>
  )
}
