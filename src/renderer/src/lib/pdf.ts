import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { FitMode } from './settings'

// PDF.js does the heavy parsing in a background worker so the UI stays smooth
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

export type PdfDoc = pdfjs.PDFDocumentProxy

export async function openPdf(bookId: string): Promise<PdfDoc> {
  const data = await window.api.readBook(bookId)
  return pdfjs.getDocument({ data }).promise
}

// Frees the memory a document uses once you're done with it
export function closePdf(doc: PdfDoc): void {
  doc.loadingTask.destroy()
}

// The part of a page to show, as fractions of the page (0 to 1)
export type CropBox = {
  left: number
  top: number
  right: number
  bottom: number
}

export type RenderOptions = {
  maxWidth: number
  maxHeight: number
  fit: FitMode
  zoom: number
  crop: CropBox | null
}

export type RenderedPage = {
  canvas: HTMLCanvasElement
  width: number
  height: number
}

// Never make a page bigger than this many pixels (keeps memory sensible when zoomed in)
const MAX_PIXELS = 24_000_000

// Renders a page to fit the space available, sharp on Retina screens.
// It draws into a hidden canvas so the visible page never flashes blank.
export async function renderPage(
  doc: PdfDoc,
  pageNumber: number,
  options: RenderOptions
): Promise<RenderedPage> {
  const page = await doc.getPage(pageNumber)
  const natural = page.getViewport({ scale: 1 })

  // Page 1 is usually the cover, so it is never cropped
  const crop = pageNumber > 1 ? options.crop : null
  const box = crop
    ? {
        x: crop.left * natural.width,
        y: crop.top * natural.height,
        width: (crop.right - crop.left) * natural.width,
        height: (crop.bottom - crop.top) * natural.height
      }
    : { x: 0, y: 0, width: natural.width, height: natural.height }

  const fitScale =
    options.fit === 'width'
      ? options.maxWidth / box.width
      : Math.min(options.maxWidth / box.width, options.maxHeight / box.height)
  const cssScale = fitScale * options.zoom

  let pixelRatio = window.devicePixelRatio || 1
  const pixels = box.width * box.height * (cssScale * pixelRatio) ** 2
  if (pixels > MAX_PIXELS) pixelRatio *= Math.sqrt(MAX_PIXELS / pixels)

  const scale = cssScale * pixelRatio
  const viewport = page.getViewport({ scale, offsetX: -box.x * scale, offsetY: -box.y * scale })

  const canvas = document.createElement('canvas')
  canvas.width = Math.floor(box.width * scale)
  canvas.height = Math.floor(box.height * scale)
  await page.render({ canvas, viewport }).promise

  return { canvas, width: canvas.width / pixelRatio, height: canvas.height / pixelRatio }
}

// Copies a rendered page onto the visible canvas in one go
export function showPage(target: HTMLCanvasElement, rendered: RenderedPage): void {
  target.width = rendered.canvas.width
  target.height = rendered.canvas.height
  target.style.width = `${rendered.width}px`
  target.style.height = `${rendered.height}px`
  target.getContext('2d')?.drawImage(rendered.canvas, 0, 0)
}

// Keeps a few rendered pages ready (current, next, previous) so page turns are instant
export class PageCache {
  private pages = new Map<string, Promise<RenderedPage>>()

  constructor(private doc: PdfDoc) {}

  private key(pageNumber: number, options: RenderOptions): string {
    return `${pageNumber}|${JSON.stringify(options)}`
  }

  get(pageNumber: number, options: RenderOptions): Promise<RenderedPage> {
    const key = this.key(pageNumber, options)
    let rendered = this.pages.get(key)
    if (!rendered) {
      rendered = renderPage(this.doc, pageNumber, options)
      rendered.catch(() => this.pages.delete(key))
      this.pages.set(key, rendered)
    }
    return rendered
  }

  // Forget everything except these pages at these settings
  keepOnly(pageNumbers: number[], options: RenderOptions): void {
    const keep = new Set(pageNumbers.map((n) => this.key(n, options)))
    for (const key of this.pages.keys()) {
      if (!keep.has(key)) this.pages.delete(key)
    }
  }
}

// --- Margin crop -----------------------------------------------------------

// Finds where the ink is on a small render of a page (null if the page is blank)
function findContent(canvas: HTMLCanvasElement): CropBox | null {
  const { width, height } = canvas
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return null
  const pixels = context.getImageData(0, 0, width, height).data

  const rowInk = new Array<number>(height).fill(0)
  const columnInk = new Array<number>(width).fill(0)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      if (pixels[i] < 220 || pixels[i + 1] < 220 || pixels[i + 2] < 220) {
        rowInk[y]++
        columnInk[x]++
      }
    }
  }

  // Ignore specks: a row or column only counts if it has a little ink in it
  const rowMin = Math.max(1, width * 0.004)
  const columnMin = Math.max(1, height * 0.004)
  const top = rowInk.findIndex((count) => count >= rowMin)
  if (top === -1) return null
  const bottom = height - 1 - [...rowInk].reverse().findIndex((count) => count >= rowMin)
  const left = columnInk.findIndex((count) => count >= columnMin)
  const right = width - 1 - [...columnInk].reverse().findIndex((count) => count >= columnMin)

  return {
    left: left / width,
    top: top / height,
    right: (right + 1) / width,
    bottom: (bottom + 1) / height
  }
}

// Works out one set of margins for the whole book by sampling a few pages, so the
// text stays the same size from page to page. Returns null if there's nothing to trim.
export async function detectCrop(doc: PdfDoc): Promise<CropBox | null> {
  const total = doc.numPages
  if (total < 2) return null

  const sampleCount = Math.min(8, total - 1)
  const samples = new Set<number>()
  for (let i = 0; i < sampleCount; i++) {
    samples.add(2 + Math.floor((i * (total - 2)) / Math.max(1, sampleCount - 1)))
  }

  let union: CropBox | null = null
  for (const pageNumber of samples) {
    const page = await doc.getPage(pageNumber)
    const natural = page.getViewport({ scale: 1 })
    const viewport = page.getViewport({ scale: 200 / natural.width })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    await page.render({ canvas, viewport }).promise

    const content = findContent(canvas)
    if (!content) continue
    const area = (content.right - content.left) * (content.bottom - content.top)
    if (area > 0.95) continue // full-page pictures shouldn't stop the text pages being trimmed

    union = union
      ? {
          left: Math.min(union.left, content.left),
          top: Math.min(union.top, content.top),
          right: Math.max(union.right, content.right),
          bottom: Math.max(union.bottom, content.bottom)
        }
      : content
  }

  if (!union) return null

  // Leave a little breathing room around the text
  const pad = 0.025
  const crop = {
    left: Math.max(0, union.left - pad),
    top: Math.max(0, union.top - pad),
    right: Math.min(1, union.right + pad),
    bottom: Math.min(1, union.bottom + pad)
  }
  const kept = (crop.right - crop.left) * (crop.bottom - crop.top)
  return kept > 0.92 ? null : crop
}

// --- Covers ----------------------------------------------------------------

// Page 1 of each book, rendered one at a time and remembered
const covers = new Map<string, Promise<string>>()
let queue: Promise<unknown> = Promise.resolve()

async function renderCover(bookId: string): Promise<string> {
  const doc = await openPdf(bookId)
  try {
    const { canvas } = await renderPage(doc, 1, {
      maxWidth: 300,
      maxHeight: 450,
      fit: 'page',
      zoom: 1,
      crop: null
    })
    return canvas.toDataURL('image/jpeg', 0.85)
  } finally {
    closePdf(doc)
  }
}

export function getCover(book: Book): Promise<string> {
  const cacheKey = `${book.id}:${book.modified}`
  let cover = covers.get(cacheKey)
  if (!cover) {
    cover = queue.then(() => renderCover(book.id))
    queue = cover.catch(() => undefined)
    covers.set(cacheKey, cover)
  }
  return cover
}
