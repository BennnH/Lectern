import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft } from 'lucide-react'
import {
  PageCache,
  closePdf,
  detectCrop,
  openPdf,
  showPage,
  type CropBox,
  type PdfDoc,
  type RenderOptions
} from '../lib/pdf'
import { getProgress, saveProgress } from '../lib/progress'
import {
  THEMES,
  loadSettings,
  nextZoom,
  saveSettings,
  type PageTheme,
  type ReaderSettings
} from '../lib/settings'
import { EASE_OUT } from '../lib/motion'
import ReaderToolbar from './ReaderToolbar'

type Props = {
  book: Book
  onClose: () => void
}

// Hide the controls and cursor after this long without mouse movement (ms)
const IDLE_MS = 2500

// Dark mode inverts the page; sepia adds a warm tint on top (see the overlay below)
const THEME_FILTER: Record<PageTheme, string> = {
  light: 'none',
  sepia: 'none',
  dark: 'invert(0.88) hue-rotate(180deg)'
}
const THEME_LABEL: Record<PageTheme, string> = { light: 'Light', sepia: 'Sepia', dark: 'Dark' }

// Each book's margins are worked out once and remembered while the app is open
const cropCache = new Map<string, CropBox | null>()

export default function Reader({ book, onClose }: Props): React.JSX.Element {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const renderCount = useRef(0)
  const pageRef = useRef(1)
  const pendingScroll = useRef<'top' | 'bottom' | null>(null)
  const flashTimer = useRef<number | undefined>(undefined)
  const cropKey = `${book.id}:${book.modified}`

  const [doc, setDoc] = useState<PdfDoc | null>(null)
  const [page, setPage] = useState(() => getProgress(book.id)?.page ?? 1)
  const [settings, setSettings] = useState<ReaderSettings>(loadSettings)
  // undefined = not worked out yet, null = nothing to trim
  const [crop, setCrop] = useState<CropBox | null | undefined>(() => cropCache.get(cropKey))
  const [area, setArea] = useState({ width: 0, height: 0 })
  const [hasRendered, setHasRendered] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const total = doc?.numPages ?? 1
  const cache = useMemo(() => (doc ? new PageCache(doc) : null), [doc])

  useEffect(() => {
    pageRef.current = page
  }, [page])

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

  // Work out the book's margins the first time cropping is needed
  useEffect(() => {
    if (!doc || !settings.crop || crop !== undefined) return
    let cancelled = false
    detectCrop(doc)
      .then((found) => {
        cropCache.set(cropKey, found)
        if (!cancelled) setCrop(found)
      })
      .catch(() => {
        if (!cancelled) setCrop(null)
      })
    return () => {
      cancelled = true
    }
  }, [doc, settings.crop, crop, cropKey])

  // Keep track of how much space the page has (re-measured when the window resizes)
  useEffect(() => {
    const el = scrollerRef.current
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

  // Track full screen (it can also be changed with the green button)
  useEffect(() => {
    window.api.isFullscreen().then(setIsFullscreen)
    return window.api.onFullscreenChange(setIsFullscreen)
  }, [])

  // Remember settings and progress
  useEffect(() => saveSettings(settings), [settings])
  useEffect(() => {
    if (doc) saveProgress(book.id, { page, total: doc.numPages, lastOpened: Date.now() })
  }, [doc, page, book.id])

  // Everything that affects how a page is drawn
  const options = useMemo<RenderOptions | null>(() => {
    if (area.width === 0) return null
    if (settings.crop && crop === undefined) return null // still measuring margins
    return {
      maxWidth: area.width,
      maxHeight: area.height,
      fit: settings.fit,
      zoom: settings.zoom,
      crop: settings.crop ? (crop ?? null) : null
    }
  }, [area, settings.fit, settings.zoom, settings.crop, crop])

  // Draw the current page, and get the next and previous ones ready in the background
  useEffect(() => {
    if (!cache || !options) return
    const thisRender = ++renderCount.current

    cache
      .get(page, options)
      .then((rendered) => {
        if (thisRender !== renderCount.current || !canvasRef.current) return
        showPage(canvasRef.current, rendered)
        const scroller = scrollerRef.current
        if (scroller && pendingScroll.current) {
          scroller.scrollTop = pendingScroll.current === 'top' ? 0 : scroller.scrollHeight
          pendingScroll.current = null
        }
        setHasRendered(true)
      })
      .catch(() => undefined)

    const neighbours = [page + 1, page - 1].filter((n) => n >= 1 && n <= total)
    for (const n of neighbours) cache.get(n, options).catch(() => undefined)
    cache.keepOnly([page - 1, page, page + 1], options)
  }, [cache, options, page, total])

  // Next: scroll down if the page is taller than the window, otherwise turn the page
  const next = useCallback(() => {
    const el = scrollerRef.current
    if (el && el.scrollTop + el.clientHeight < el.scrollHeight - 4) {
      el.scrollBy({ top: el.clientHeight * 0.85, behavior: 'smooth' })
      return
    }
    if (pageRef.current < total) {
      pageRef.current += 1
      pendingScroll.current = 'top'
      setPage(pageRef.current)
    }
  }, [total])

  // Back: scroll up if not at the top, otherwise go to the bottom of the previous page
  const prev = useCallback(() => {
    const el = scrollerRef.current
    if (el && el.scrollTop > 4) {
      el.scrollBy({ top: -el.clientHeight * 0.85, behavior: 'smooth' })
      return
    }
    if (pageRef.current > 1) {
      pageRef.current -= 1
      pendingScroll.current = 'bottom'
      setPage(pageRef.current)
    }
  }, [])

  // A short message in the middle of the screen, e.g. "Sepia" or "125%"
  const showFlash = useCallback((message: string) => {
    setFlash(message)
    window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => setFlash(null), 900)
  }, [])

  const cycleTheme = useCallback(() => {
    const theme = THEMES[(THEMES.indexOf(settings.theme) + 1) % THEMES.length]
    setSettings({ ...settings, theme })
    showFlash(THEME_LABEL[theme])
  }, [settings, showFlash])

  const toggleCrop = useCallback(() => {
    setSettings({ ...settings, crop: !settings.crop })
    showFlash(settings.crop ? 'Full page' : 'Margins trimmed')
  }, [settings, showFlash])

  const toggleFit = useCallback(() => {
    const fit = settings.fit === 'page' ? 'width' : 'page'
    setSettings({ ...settings, fit, zoom: 1 })
    showFlash(fit === 'width' ? 'Fit to width' : 'Fit to page')
  }, [settings, showFlash])

  const changeZoom = useCallback(
    (zoom: number) => {
      setSettings({ ...settings, zoom })
      showFlash(`${Math.round(zoom * 100)}%`)
    },
    [settings, showFlash]
  )
  const zoomIn = useCallback(
    () => changeZoom(nextZoom(settings.zoom, 1)),
    [changeZoom, settings.zoom]
  )
  const zoomOut = useCallback(
    () => changeZoom(nextZoom(settings.zoom, -1)),
    [changeZoom, settings.zoom]
  )
  const zoomReset = useCallback(() => changeZoom(1), [changeZoom])

  const toggleFullscreen = useCallback(() => {
    window.api.toggleFullscreen()
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.metaKey || e.ctrlKey || e.altKey) return // leave Cmd+Q, Cmd+R etc. alone
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
      const actions: Record<string, () => void> = {
        ArrowRight: next,
        ArrowDown: next,
        PageDown: next,
        ' ': next,
        ArrowLeft: prev,
        ArrowUp: prev,
        PageUp: prev,
        Escape: onClose,
        f: toggleFullscreen,
        t: cycleTheme,
        c: toggleCrop,
        w: toggleFit,
        '=': zoomIn,
        '+': zoomIn,
        '-': zoomOut,
        _: zoomOut,
        '0': zoomReset
      }
      const action = actions[key]
      if (action) {
        e.preventDefault()
        action()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    next,
    prev,
    onClose,
    toggleFullscreen,
    cycleTheme,
    toggleCrop,
    toggleFit,
    zoomIn,
    zoomOut,
    zoomReset
  ])

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

  // Click the right half of the screen to go forward, the left half to go back
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
        ref={scrollerRef}
        onClick={onAreaClick}
        className="no-scrollbar absolute inset-x-6 top-10 bottom-10 flex overflow-auto"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: hasRendered ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          className="relative m-auto shrink-0 overflow-hidden rounded-sm shadow-2xl shadow-black/60"
        >
          <canvas
            ref={canvasRef}
            className="block transition-[filter] duration-300"
            style={{ filter: THEME_FILTER[settings.theme] }}
          />
          <div
            className="pointer-events-none absolute inset-0 bg-[#f3e6cc] mix-blend-multiply transition-opacity duration-300"
            style={{ opacity: settings.theme === 'sepia' ? 1 : 0 }}
          />
        </motion.div>
      </div>

      {error && (
        <p className="absolute inset-0 flex items-center justify-center text-sm text-neutral-400">
          {error}
        </p>
      )}

      <AnimatePresence>
        {flash && (
          <div className="pointer-events-none absolute inset-x-0 top-12 z-[60] flex justify-center">
            <motion.div
              key={flash}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: EASE_OUT }}
              className="rounded-full bg-neutral-900/85 px-4 py-1.5 text-sm text-neutral-200 ring-1 ring-white/10 backdrop-blur-md"
            >
              {flash}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={onClose}
        onMouseDown={(e) => e.preventDefault()}
        animate={{ opacity: controlsVisible ? 1 : 0 }}
        transition={{ duration: 0.25 }}
        className={`app-no-drag absolute top-2 left-20 z-[60] flex items-center gap-1.5 rounded-full px-3 py-1 text-sm text-neutral-400 transition-colors hover:bg-white/5 hover:text-white ${controlsVisible ? '' : 'pointer-events-none'}`}
      >
        <ArrowLeft size={14} />
        Library
      </motion.button>

      <ReaderToolbar
        visible={controlsVisible}
        settings={settings}
        page={page}
        total={total}
        isFullscreen={isFullscreen}
        onCycleTheme={cycleTheme}
        onToggleCrop={toggleCrop}
        onToggleFit={toggleFit}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onZoomReset={zoomReset}
        onToggleFullscreen={toggleFullscreen}
      />
    </motion.div>
  )
}
