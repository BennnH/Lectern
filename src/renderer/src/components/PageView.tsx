import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'
import {
  PageCache,
  detectCrop,
  showPage,
  type CropBox,
  type PdfDoc,
  type RenderOptions
} from '../lib/pdf'
import type { PageTheme, ReaderSettings } from '../lib/settings'

// What the reader can ask a view to do (both PageView and ReflowView provide this)
export type ViewHandle = {
  next: () => void
  prev: () => void
}

type Props = {
  ref: React.Ref<ViewHandle>
  doc: PdfDoc
  page: number
  onPageChange: (page: number) => void
  settings: ReaderSettings
  bookKey: string
}

// Dark mode inverts the page; sepia adds a warm tint on top (see the overlay below)
const THEME_FILTER: Record<PageTheme, string> = {
  light: 'none',
  sepia: 'none',
  dark: 'invert(0.88) hue-rotate(180deg)'
}

// Each book's margins are worked out once and remembered while the app is open
const cropCache = new Map<string, CropBox | null>()

// Shows the PDF's original pages
export default function PageView({
  ref,
  doc,
  page,
  onPageChange,
  settings,
  bookKey
}: Props): React.JSX.Element {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const renderCount = useRef(0)
  const pageRef = useRef(page)
  const pendingScroll = useRef<'top' | 'bottom' | null>(null)

  // undefined = not worked out yet, null = nothing to trim
  const [crop, setCrop] = useState<CropBox | null | undefined>(() => cropCache.get(bookKey))
  const [area, setArea] = useState({ width: 0, height: 0 })
  const [hasRendered, setHasRendered] = useState(false)

  const total = doc.numPages
  const cache = useMemo(() => new PageCache(doc), [doc])

  useEffect(() => {
    pageRef.current = page
  }, [page])

  // Work out the book's margins the first time cropping is needed
  useEffect(() => {
    if (!settings.crop || crop !== undefined) return
    let cancelled = false
    detectCrop(doc)
      .then((found) => {
        cropCache.set(bookKey, found)
        if (!cancelled) setCrop(found)
      })
      .catch(() => {
        if (!cancelled) setCrop(null)
      })
    return () => {
      cancelled = true
    }
  }, [doc, settings.crop, crop, bookKey])

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
    if (!options) return
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
      onPageChange(pageRef.current)
    }
  }, [total, onPageChange])

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
      onPageChange(pageRef.current)
    }
  }, [onPageChange])

  useImperativeHandle(ref, () => ({ next, prev }), [next, prev])

  // Click the right half of the screen to go forward, the left half to go back
  const onAreaClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    const rect = e.currentTarget.getBoundingClientRect()
    if (e.clientX - rect.left > rect.width / 2) next()
    else prev()
  }

  return (
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
  )
}
