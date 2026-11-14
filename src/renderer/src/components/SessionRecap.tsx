import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { fractionAt, formatDuration, pagesPerHour } from '../lib/stats'
import { getSessions } from '../lib/store'
import { EASE_OUT } from '../lib/motion'

type Props = {
  session: ReadingSession
  onDone: () => void
}

// Counts a number up from 0 to its value, for a satisfying reveal
function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(0)
  useEffect(() => {
    const started = performance.now()
    let frame = 0
    const step = (now: number): void => {
      const t = Math.min(1, (now - started) / durationMs)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(target * eased)
      if (t < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [target, durationMs])
  return value
}

function Stat({
  value,
  label,
  accent = false
}: {
  value: string
  label: string
  accent?: boolean
}): React.JSX.Element {
  return (
    <div>
      <p
        className={`text-3xl font-semibold tracking-tight tabular-nums ${accent ? 'text-emerald-400' : 'text-neutral-50'}`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-neutral-500">{label}</p>
    </div>
  )
}

// The card shown after a reading session: time, pages and progress gained
export default function SessionRecap({ session, onDone }: Props): React.JSX.Element {
  const total = session.totalPages
  const start = fractionAt(session.startPage, total) * 100
  const end = fractionAt(session.endPage, total) * 100
  const gain = end - start
  const pace = pagesPerHour(getSessions(), session.bookId)
  const pagesLeft = total - session.endPage

  const shownTime = useCountUp(session.activeMs)
  const shownPages = useCountUp(session.pagesRead)
  const shownGain = useCountUp(Math.round(gain))

  // Esc or Enter closes the card
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' || e.key === 'Enter') onDone()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onDone])

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onClick={onDone}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ duration: 0.4, ease: EASE_OUT }}
        className="w-[460px] rounded-2xl bg-neutral-900/95 p-7 shadow-2xl ring-1 shadow-black/50 ring-white/10"
      >
        <p className="text-[11px] font-medium tracking-[0.18em] text-neutral-500 uppercase">
          Session complete
        </p>
        <h2 className="mt-1 truncate text-lg font-semibold text-neutral-100">{session.title}</h2>

        <div className="mt-6 grid grid-cols-3 gap-4">
          <Stat value={formatDuration(shownTime)} label="reading" />
          <Stat
            value={String(Math.round(shownPages))}
            label={session.pagesRead === 1 ? 'page read' : 'pages read'}
          />
          <Stat
            value={`${gain >= 0 ? '+' : '−'}${Math.abs(Math.round(shownGain))}%`}
            label="progress"
            accent={gain > 0}
          />
        </div>

        {/* The whole book, with this session's chunk highlighted */}
        <div className="mt-7">
          <div className="relative h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-white/30"
              style={{ width: `${Math.min(start, end)}%` }}
            />
            {gain > 0 && (
              <motion.div
                className="absolute inset-y-0 bg-emerald-400"
                style={{ left: `${start}%` }}
                initial={{ width: 0 }}
                animate={{ width: `${gain}%` }}
                transition={{ delay: 0.35, duration: 0.8, ease: EASE_OUT }}
              />
            )}
          </div>
          <div className="mt-2 flex justify-between text-xs text-neutral-500 tabular-nums">
            <span>
              {Math.round(start)}% → {Math.round(end)}%
            </span>
            <span>{pagesLeft === 1 ? '1 page left' : `${pagesLeft} pages left`}</span>
          </div>
        </div>

        {pace && pagesLeft > 0 && (
          <p className="mt-5 text-sm text-neutral-400">
            About {Math.round(pace)} pages an hour ·{' '}
            {formatDuration((pagesLeft / pace) * 3_600_000)} left at this pace
          </p>
        )}

        <div className="mt-7 flex justify-end">
          <button
            type="button"
            onClick={onDone}
            className="rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
          >
            Done
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
