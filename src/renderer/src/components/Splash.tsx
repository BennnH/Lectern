import { useEffect } from 'react'
import { motion } from 'motion/react'
import { EASE_OUT } from '../lib/motion'

// How long the splash stays on screen (ms). Any key or click skips it.
const SPLASH_MS = 1400

type Props = {
  onDone: () => void
}

export default function Splash({ onDone }: Props): React.JSX.Element {
  useEffect(() => {
    const timer = window.setTimeout(onDone, SPLASH_MS)
    window.addEventListener('keydown', onDone)
    window.addEventListener('mousedown', onDone)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('keydown', onDone)
      window.removeEventListener('mousedown', onDone)
    }
  }, [onDone])

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      exit={{ opacity: 0, scale: 0.98, filter: 'blur(6px)' }}
      transition={{ duration: 0.35, ease: EASE_OUT }}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.8, ease: EASE_OUT }}
        className="text-center"
      >
        <h1 className="text-5xl font-semibold tracking-tight">Lectern</h1>
        <p className="mt-3 text-sm text-neutral-400">Hands-free reading.</p>
      </motion.div>
    </motion.div>
  )
}
