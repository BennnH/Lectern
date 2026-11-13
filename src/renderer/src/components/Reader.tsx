import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { closePdf, openPdf, renderPage, showPage, type PdfDoc } from '../lib/pdf'
import { getProgress, saveProgress } from '../lib/progress'
import { EASE_OUT } from '../lib/motion'

type Props = {
  book: Book
  onClose: () => void
}

// Hide the controls and cursor after this long without mouse movement (ms)
const IDLE_MS = 2500

export default function Reader({ book, onClose }: Props): React.JSX.Element {
  const areaRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const renderCount = useRef(0)

  const [doc, setDoc] = useState<PdfDoc | null>(null)
  const [page, setPage] = useState(() => getProgress(book.id)?.page ?? 1)
  const [area, setArea] = useState({ width: 0, height: 0 })
  const [hasRendered, setHasRendered] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const total = doc?.numPages ?? 1

  // Open the PDF (and close it again when leaving the reader)
  useEffect(() => {
    let cancelled = false
    let opened: PdfDoc | null = null
    openPdf(book.id)
      .then((loaded) => {
        if (cancelled) {
          closePdf(loaded)
          return
        }
        opened = loaded
        setDoc(loaded)
        setPage((p) => Math.min(Math.max(1, p), loaded.numPages))
      })
      .catch(() => {
        if (!cancelled) setError('This PDF could not be opened.')
      })
    return () => {
      cancelled = true
      if (opened) closePdf(opened)
    }
  }, [book.id])

  // Keep track of how much space the page has (re-measured when the window resizes)
  useEffect(() => {
    const el = areaRef.current
    if (!el) return
    let timer: number | undefined
    const observer = new ResizeObserver(([entry]) => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        setArea({ width: entry.contentRect.width, height: entry.contentRect.height })
      }, 60)
    })
    observer.observe(el)
    return () => {
      window.clearTimeout(timer)
      observer.disconnect()
    }
  }, [])

  // Draw the current page. If you flip pages quickly, older renders are thrown away.
  useEffect(() => {
    if (!doc || area.width === 0) return
    const thisRender = ++renderCount.current
    renderPage(doc, page, area.width, area.height)
      .then((rendered) => {
        if (thisRender !== renderCount.current || !canvasRef.current) return
        showPage(canvasRef.current, rendered)
        setHasRendered(true)
      })
      .catch(() => undefined)
  }, [doc, page, area])

  // Remember where you are
  useEffect(() => {
    if (doc) saveProgress(book.id, { page, total: doc.numPages, lastOpened: Date.now() })
  }, [doc, page, book.id])

  const next = useCallback(() => setPage((p) => Math.min(p + 1, total)), [total])
  const prev = useCallback(() => setPage((p) => Math.max(p - 1, 1)), [])

  // Keyboard: arrows, space and page up/down turn pages, Esc goes back
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(e.key)) {
        e.preventDefault()
        next()
      } else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) {
        e.preventDefault()
        prev()
      } else if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, prev, onClose])

  // Show the controls when the mouse moves, hide them when it stops
  useEffect(() => {
    let timer = window.setTimeout(() => setControlsVisible(false), IDLE_MS)
    const onMove = (): void => {
      setControlsVisible(true)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setControlsVisible(false), IDLE_MS)
    }
    window.addEventListener('mousemove', onMove)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('mousemove', onMove)
    }
  }, [])

  // Click the right half of the page to go forward, the left half to go back
  const onAreaClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    const rect = e.currentTarget.getBoundingClientRect()
    if (e.clientX - rect.left > rect.width / 2) next()
    else prev()
  }

  return (
    <motion.div
      className={`absolute inset-0 bg-neutral-950 ${controlsVisible ? '' : 'cursor-none'}`}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.35, ease: EASE_OUT }}
    >
      <div
        ref={areaRef}
        onClick={onAreaClick}
        className="absolute inset-x-6 top-10 bottom-10 flex items-center justify-center"
      >
        <motion.canvas
          ref={canvasRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: hasRendered ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-sm shadow-2xl shadow-black/60"
        />
      </div>

      {error && (
        <p className="absolute inset-0 flex items-center justify-center text-sm text-neutral-400">
          {error}
        </p>
      )}

      <motion.button
        type="button"
        onClick={onClose}
        animate={{ opacity: controlsVisible ? 1 : 0 }}
        transition={{ duration: 0.25 }}
        className={`app-no-drag absolute top-2 left-20 z-[60] rounded-full px-3 py-1 text-sm text-neutral-400 transition-colors hover:bg-white/5 hover:text-white ${controlsVisible ? '' : 'pointer-events-none'}`}
      >
        ← Library
      </motion.button>

      <motion.p
        animate={{ opacity: controlsVisible ? 1 : 0 }}
        transition={{ duration: 0.25 }}
        className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-xs text-neutral-500 tabular-nums"
      >
        {page} / {total}
      </motion.p>
    </motion.div>
  )
}
