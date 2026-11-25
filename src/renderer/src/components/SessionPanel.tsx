import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { fractionAt, formatDuration, pagesPerHour, type SessionTracker } from '../lib/stats'
import { getSessions } from '../lib/store'
import { EASE_OUT } from '../lib/motion'

type Props = {
  tracker: SessionTracker
  page: number
  total: number
}

// A small live panel showing how the current reading session is going (toggle with I)
export default function SessionPanel({ tracker, page, total }: Props): React.JSX.Element {
  // Re-draw every second so the reading time ticks
  const [, setTick] = useState(0)
  useEffect(() => {
    const timer = window.setInterval(() => setTick((tick) => tick + 1), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const { session } = tracker
  const start = Math.round(fractionAt(session.startPage, total) * 100)
  const now = Math.round(fractionAt(page, total) * 100)
  const gain = now - start
  const pace = pagesPerHour(getSessions(), session.bookId)

  const rows: [string, string][] = [
    ['Reading', formatDuration(tracker.liveActiveMs())],
    ['Pages', String(session.pagesRead)],
    ['Book page', `${page} of ${total}`],
    ['Progress', `${start}% → ${now}%  (${gain >= 0 ? '+' : ''}${gain}%)`],
    ['Pace', pace ? `${Math.round(pace)} pages / hour` : 'Needs ~10 min'],
    ['Book left', pace ? formatDuration(((total - page) / pace) * 3_600_000) : '—']
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: EASE_OUT }}
      className="pointer-events-none absolute top-12 right-6 z-[60] w-64 rounded-2xl bg-neutral-900/85 p-4 ring-1 ring-white/10 backdrop-blur-md"
    >
      <p className="mb-3 text-[11px] font-medium tracking-[0.16em] text-neutral-500 uppercase">
        This session
      </p>
      <dl className="space-y-1.5 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4">
            <dt className="text-neutral-500">{label}</dt>
            <dd className="text-right text-neutral-100 tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </motion.div>
  )
}
