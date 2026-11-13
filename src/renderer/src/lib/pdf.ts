import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

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

export type RenderedPage = {
  canvas: HTMLCanvasElement
  width: number
  height: number
}

// Renders a page to fit inside maxWidth x maxHeight, sharp on Retina screens.
// It draws into a hidden canvas first so the visible page never flashes blank.
export async function renderPage(
  doc: PdfDoc,
  pageNumber: number,
  maxWidth: number,
  maxHeight: number
): Promise<RenderedPage> {
  const page = await doc.getPage(pageNumber)
  const natural = page.getViewport({ scale: 1 })
  const fit = Math.min(maxWidth / natural.width, maxHeight / natural.height)
  const pixelRatio = window.devicePixelRatio || 1
  const viewport = page.getViewport({ scale: fit * pixelRatio })

  const canvas = document.createElement('canvas')
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)
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

// Covers: page 1 of each book, rendered one at a time and remembered
const covers = new Map<string, Promise<string>>()
let queue: Promise<unknown> = Promise.resolve()

async function renderCover(bookId: string): Promise<string> {
  const doc = await openPdf(bookId)
  try {
    const { canvas } = await renderPage(doc, 1, 300, 450)
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
