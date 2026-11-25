import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Trophy } from 'lucide-react'
import { EASE_OUT } from '../lib/motion'
import { PALETTES } from '../lib/palettes'

type Props = {
  pages: number // pages read today
  colour: string // the reading calendar's colour
}

// Shown in the reader the moment you reach your daily goal: a burst of confetti and a banner.
// With Reduce Motion turned on (System Settings → Accessibility), just the banner.
export default function GoalReached({ pages, colour }: Props): React.JSX.Element {
  const reduceMotion = useReducedMotion()

  return (
    <>
      {!reduceMotion && <Confetti />}
      <div className="pointer-events-none absolute inset-x-0 top-16 z-[65] flex justify-center">
        <motion.div
          role="status"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: EASE_OUT }}
          className="flex items-center gap-3 rounded-2xl bg-neutral-900/90 py-3 pr-5 pl-3 shadow-xl ring-1 shadow-black/40 ring-white/10 backdrop-blur-md"
        >
          <span
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{ backgroundColor: `${colour}26`, color: colour }}
          >
            <Trophy size={17} />
          </span>
          <div>
            <p className="text-sm font-medium text-neutral-100">Daily goal reached!</p>
            <p className="text-xs text-neutral-400 tabular-nums">{pages} pages today</p>
          </div>
        </motion.div>
      </div>
    </>
  )
}

type Piece = {
  x: number // how far it drifts sideways (px)
  rise: number // how high it's thrown before falling (px)
  spin: number // degrees
  delay: number // seconds
  duration: number // seconds
  colour: string
  round: boolean
}

// Every calendar colour except plain white
const COLOURS = PALETTES.filter((palette) => palette.id !== 'mono').map((palette) => palette.colour)

function makePieces(count: number): Piece[] {
  return Array.from({ length: count }, (_, index) => ({
    x: (Math.random() - 0.5) * 1000,
    rise: 30 + Math.random() * 70,
    spin: (Math.random() - 0.5) * 1080,
    delay: Math.random() * 0.15,
    duration: 2 + Math.random() * 1.2,
    colour: COLOURS[index % COLOURS.length],
    round: Math.random() < 0.3
  }))
}

// Pieces thrown up from behind the banner, which then fall past the bottom of the window
function Confetti(): React.JSX.Element {
  const [pieces] = useState(() => makePieces(80))
  const fall = window.innerHeight

  return (
    <div className="pointer-events-none absolute inset-0 z-[64] overflow-hidden" aria-hidden="true">
      {pieces.map((piece, index) => {
        const timing = { duration: piece.duration, delay: piece.delay }
        return (
          <motion.span
            key={index}
            className="absolute top-[5.5rem] left-1/2"
            style={{
              width: piece.round ? 8 : 6,
              height: piece.round ? 8 : 12,
              borderRadius: piece.round ? 9999 : 2,
              backgroundColor: piece.colour
            }}
            initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
            animate={{
              x: piece.x,
              y: [0, -piece.rise, fall],
              rotate: piece.spin,
              opacity: [1, 1, 0]
            }}
            transition={{
              x: { ...timing, ease: 'easeOut' },
              // Up quickly, then gravity takes over
              y: { ...timing, times: [0, 0.22, 1], ease: ['easeOut', 'easeIn'] },
              rotate: { ...timing, ease: 'linear' },
              opacity: { ...timing, times: [0, 0.8, 1] }
            }}
          />
        )
      })}
    </div>
  )
}
