import { useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { renderPage, type PdfDoc } from '../lib/pdf'
import type { Block, ReflowBook } from '../lib/reflow'
import { REFLOW_COLOURS, type PageTheme } from '../lib/settings'
import type { ViewHandle } from './PageView'

export type ReflowLocation = {
  block: number // first block visible on screen
  firstPage: number // the PDF pages this screen's text comes from (for counting pages read)
  lastPage: number
  pageInSection: number // screens in this chapter, at the current text size
  pagesInSection: number
  chapter: boolean // whether the section is a chapter (see Section in lib/reflow.ts)
}

type Props = {
  ref: React.Ref<ViewHandle>
  book: ReflowBook
  doc: PdfDoc
  startBlock: number
  startPage?: number // for Go to page: the page to open at, which may be part-way through startBlock
  fontSize: number
  theme: PageTheme
  onLocationChange: (location: ReflowLocation) => void
}

// Space between one screen of text and the next (px)
const GAP = 64
// Keep lines a comfortable length: about this many font-sizes wide at most
const MAX_LINE_EMS = 34

// The PDF page a block has reached at the start or end of a screen. A paragraph can run
// over several screens and pages, so part-way through, estimate the page from how far
// through the paragraph this screen is.
function pageOnScreen(
  block: Block,
  screens: { first: number; last: number } | undefined,
  screen: number,
  edge: 'start' | 'end'
): number {
  if (!screens) return block.page
  const pageCount = block.endPage - block.page + 1
  const screenCount = screens.last - screens.first + 1
  const screensDone = screen - screens.first + (edge === 'end' ? 1 : 0)
  const share = (pageCount * screensDone) / screenCount
  return block.page + (edge === 'end' ? Math.max(0, Math.ceil(share) - 1) : Math.floor(share))
}

// The screen a page starts on, when it starts part-way through a long paragraph (the
// opposite of pageOnScreen). Otherwise, the paragraph's first screen.
function screenForPage(
  block: Block | undefined,
  screens: { first: number; last: number } | undefined,
  page: number | undefined
): number {
  if (!screens) return 0
  if (!block || page === undefined || page <= block.page) return screens.first
  const share = (page - block.page) / (block.endPage - block.page + 1)
  return screens.first + Math.floor(share * (screens.last - screens.first + 1))
}

// Shows the book as flowing text, laid out into screen-sized pages with CSS columns.
// Changing the font size re-wraps the text, like a Kindle.
export default function ReflowView({
  ref,
  book,
  doc,
  startBlock,
  startPage,
  fontSize,
  theme,
  onLocationChange
}: Props): React.JSX.Element {
  const areaRef = useRef<HTMLDivElement>(null)
  const columnsRef = useRef<HTMLDivElement>(null)
  // Where to land after the next layout: a block (optionally a page part-way through it),
  // or the start/end of a section
  const target = useRef<{ block?: number; page?: number; edge?: 'start' | 'end' } | null>({
    block: startBlock,
    page: startPage
  })
  const currentBlock = useRef(startBlock)
  // Which screen each block starts and ends on
  const blockPages = useRef(new Map<number, { first: number; last: number }>())
  const requestedImages = useRef(new Set<number>())
  // After a re-layout, the screen we're about to jump to (until React has caught up)
  const expectedIndex = useRef<number | null>(null)

  const [area, setArea] = useState({ width: 0, height: 0 })
  const [section, setSection] = useState(() =>
    Math.max(
      0,
      book.sections.findIndex((s) => startBlock >= s.start && startBlock < s.end)
    )
  )
  const [pageIndex, setPageIndex] = useState(0)
  const [pageCount, setPageCount] = useState(1)
  const [animate, setAnimate] = useState(false)
  const [fontReady, setFontReady] = useState(false)
  const [images, setImages] = useState<Record<number, string>>({})
  const [layoutVersion, setLayoutVersion] = useState(0)

  const pageWidth = Math.min(area.width, Math.round(fontSize * MAX_LINE_EMS))
  const pageHeight = area.height
  const stride = pageWidth + GAP
  const { start, end, chapter } = book.sections[section]
  const colours = REFLOW_COLOURS[theme]

  // Measure the space available (and again whenever the window resizes)
  useEffect(() => {
    const el = areaRef.current
    if (!el) return
    let timer: number | undefined
    const observer = new ResizeObserver(([entry]) => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        setArea({
          width: Math.floor(entry.contentRect.width),
          height: Math.floor(entry.contentRect.height)
        })
      }, 60)
    })
    observer.observe(el)
    return () => {
      window.clearTimeout(timer)
      observer.disconnect()
    }
  }, [])

  // Pages can only be counted once the reading font has loaded
  useEffect(() => {
    let alive = true
    const ready = (): void => {
      if (alive) setFontReady(true)
    }
    document.fonts.load(`${fontSize}px "Literata Variable"`).then(ready, ready)
    return () => {
      alive = false
    }
  }, [fontSize])

  // Draw picture pages (covers, maps) for the current section
  useEffect(() => {
    for (const block of book.blocks.slice(start, end)) {
      if (block.kind !== 'image' || requestedImages.current.has(block.page)) continue
      requestedImages.current.add(block.page)
      renderPage(doc, block.page, {
        maxWidth: 800,
        maxHeight: 1100,
        fit: 'page',
        zoom: 1,
        crop: null
      })
        .then(({ canvas }) => {
          const url = canvas.toDataURL('image/jpeg', 0.9)
          setImages((current) => ({ ...current, [block.page]: url }))
        })
        .catch(() => undefined)
    }
  }, [book.blocks, doc, start, end])

  // After the text is laid out: count the pages and find which page each block starts on
  useLayoutEffect(() => {
    const columns = columnsRef.current
    if (!columns || pageWidth <= 0 || pageHeight <= 0 || !fontReady) return

    const count = Math.max(1, Math.round((columns.scrollWidth + GAP) / stride))
    const origin = columns.getBoundingClientRect().left
    const pageAt = (left: number): number => Math.floor((left - origin + 1) / stride)
    const pages = new Map<number, { first: number; last: number }>()
    columns.querySelectorAll<HTMLElement>('[data-block]').forEach((el) => {
      // A paragraph split across screens has one rectangle per screen
      const rects = el.getClientRects()
      if (rects.length === 0) return
      pages.set(Number(el.dataset.block), {
        first: pageAt(rects[0].left),
        last: pageAt(rects[rects.length - 1].left)
      })
    })
    blockPages.current = pages

    // Stay on the same text after a font or window size change
    const goal = target.current ?? { block: currentBlock.current }
    target.current = null
    let index = 0
    if (goal.edge === 'end') index = count - 1
    else if (goal.block !== undefined)
      index = screenForPage(book.blocks[goal.block], pages.get(goal.block), goal.page)

    // Jump straight there (no slide animation) after a re-layout
    const newIndex = Math.min(Math.max(0, index), count - 1)
    expectedIndex.current = newIndex
    setAnimate(false)
    setPageCount(count)
    setPageIndex(newIndex)
    setLayoutVersion((version) => version + 1)
  }, [section, fontSize, pageWidth, pageHeight, stride, fontReady, book.blocks])

  // Tell the reader which text is on screen (for saving progress)
  useEffect(() => {
    if (blockPages.current.size === 0) return // not laid out yet
    // Mid-way through a re-layout the screen number is out of date: wait for the jump
    if (expectedIndex.current !== null) {
      if (pageIndex !== expectedIndex.current) return
      expectedIndex.current = null
    }
    // The first and last blocks showing on this screen (blocks are in reading order)
    let block = -1
    let lastBlock = start
    for (const [index, pages] of blockPages.current) {
      if (pages.first > pageIndex) break // this block and the rest start on later screens
      if (block === -1 && pages.last >= pageIndex) block = index
      lastBlock = index
    }
    if (block === -1) block = start
    currentBlock.current = block
    const firstPage = pageOnScreen(
      book.blocks[block],
      blockPages.current.get(block),
      pageIndex,
      'start'
    )
    const lastPage = pageOnScreen(
      book.blocks[lastBlock],
      blockPages.current.get(lastBlock),
      pageIndex,
      'end'
    )
    onLocationChange({
      block,
      firstPage,
      lastPage: Math.max(firstPage, lastPage),
      pageInSection: pageIndex + 1,
      pagesInSection: pageCount,
      chapter
    })
  }, [pageIndex, pageCount, start, chapter, layoutVersion, onLocationChange, book.blocks])

  const next = (): void => {
    if (pageIndex < pageCount - 1) {
      setAnimate(true)
      setPageIndex(pageIndex + 1)
    } else if (section < book.sections.length - 1) {
      target.current = { edge: 'start' }
      setSection(section + 1)
    }
  }

  const prev = (): void => {
    if (pageIndex > 0) {
      setAnimate(true)
      setPageIndex(pageIndex - 1)
    } else if (section > 0) {
      target.current = { edge: 'end' }
      setSection(section - 1)
    }
  }

  useImperativeHandle(ref, () => ({ next, prev }))

  // Click the right half of the screen to go forward, the left half to go back
  const onAreaClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    const rect = e.currentTarget.getBoundingClientRect()
    if (e.clientX - rect.left > rect.width / 2) next()
    else prev()
  }

  return (
    <div
      ref={areaRef}
      onClick={onAreaClick}
      className="absolute inset-x-10 top-14 bottom-14 flex items-center justify-center"
    >
      <div className="relative overflow-hidden" style={{ width: pageWidth, height: pageHeight }}>
        <motion.div
          key={section}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
        >
          <div
            ref={columnsRef}
            lang="en"
            className="font-serif"
            style={{
              height: pageHeight,
              columnWidth: pageWidth,
              columnGap: GAP,
              columnFill: 'auto',
              fontSize,
              lineHeight: 1.6,
              color: colours.text,
              hyphens: 'auto',
              transform: `translateX(${-pageIndex * stride}px)`,
              transition: animate ? 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none'
            }}
          >
            {book.blocks.slice(start, end).map((block, i) => {
              const index = start + i
              const previous = book.blocks[index - 1]
              if (block.kind === 'image') {
                return (
                  <div
                    key={index}
                    data-block={index}
                    className="flex items-center justify-center"
                    style={{ height: pageHeight, breakBefore: 'column', breakAfter: 'column' }}
                  >
                    {images[block.page] && (
                      <img
                        src={images[block.page]}
                        alt=""
                        draggable={false}
                        className="max-h-full max-w-full rounded-sm shadow-lg"
                      />
                    )}
                  </div>
                )
              }
              if (block.kind === 'heading') {
                return (
                  <h2
                    key={index}
                    data-block={index}
                    className="mt-[1.2em] mb-[1.4em] text-center text-[1.3em] leading-snug whitespace-pre-line"
                    style={{ breakAfter: 'avoid' }}
                  >
                    {block.text}
                  </h2>
                )
              }
              if (block.kind === 'scene') {
                return (
                  <p key={index} data-block={index} className="my-[1em] text-center">
                    {block.text}
                  </p>
                )
              }
              // Book-style paragraphs: indented, except straight after a heading or break
              const indent = previous?.kind === 'paragraph'
              return (
                <p
                  key={index}
                  data-block={index}
                  className="text-justify"
                  style={{ textIndent: indent ? '1.4em' : 0, orphans: 2, widows: 2 }}
                >
                  {block.text}
                </p>
              )
            })}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
