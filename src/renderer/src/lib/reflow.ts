import { pageHasInk, type PdfDoc } from './pdf'

// Reflow turns a PDF's fixed pages back into flowing text (headings, paragraphs and
// pictures) so it can be re-wrapped at any font size, like a Kindle book.

export type BlockKind = 'heading' | 'paragraph' | 'scene' | 'image'

export type Block = {
  kind: BlockKind
  text: string
  page: number // the PDF page this block starts on
  endPage: number // and the page it ends on (a paragraph can run onto the next page)
  offset: number // characters before this block, for working out % read
}

// A chapter-sized slice of the book. Only one section is laid out at a time, which keeps
// font-size changes fast even for very long books.
export type Section = {
  start: number // first block index
  end: number // one past the last block index
}

export type ReflowBook = {
  blocks: Block[]
  sections: Section[]
  totalChars: number
  hasText: boolean // false for scanned PDFs (pictures of pages, no real text)
}

type Line = {
  text: string
  x0: number
  x1: number
  y: number // baseline, measured up from the bottom of the page
  size: number
}

type PageText = {
  page: number
  height: number
  lines: Line[]
  chars: number
}

type TextPiece = {
  str: string
  transform: number[]
  width: number
  height: number
}

// --- Step 1: read each page's text and group it into lines -----------------

async function readPage(doc: PdfDoc, pageNumber: number): Promise<PageText> {
  const page = await doc.getPage(pageNumber)
  const [left, bottom, , top] = page.view
  const content = await page.getTextContent()

  const pieces = content.items
    .filter((item): item is TextPiece & typeof item => 'str' in item)
    .filter((item) => item.str.trim() !== '')
    // Skip rotated text (stamps, sideways labels)
    .filter((item) => Math.abs(item.transform[1]) < 0.01 && Math.abs(item.transform[2]) < 0.01)
    .map((item) => ({
      str: item.str,
      x: item.transform[4] - left,
      y: item.transform[5] - bottom,
      width: item.width,
      size: Math.abs(item.transform[3]) || item.height
    }))
    .sort((a, b) => b.y - a.y || a.x - b.x)

  // Pieces on (roughly) the same baseline belong to the same line
  const groups: (typeof pieces)[] = []
  for (const piece of pieces) {
    const current = groups[groups.length - 1]
    if (
      current &&
      Math.abs(current[0].y - piece.y) <= Math.max(current[0].size, piece.size) * 0.45
    ) {
      current.push(piece)
    } else {
      groups.push([piece])
    }
  }

  const lines: Line[] = groups.map((group) => {
    group.sort((a, b) => a.x - b.x)
    let text = ''
    let lastEnd: number | null = null
    let size = 0
    for (const piece of group) {
      // Some PDFs position each word separately with no space characters in between
      if (lastEnd !== null && piece.x - lastEnd > piece.size * 0.18) {
        if (!text.endsWith(' ') && !piece.str.startsWith(' ')) text += ' '
      }
      text += piece.str
      lastEnd = piece.x + piece.width
      size = Math.max(size, piece.size)
    }
    const last = group[group.length - 1]
    return {
      text: text
        .replace(/\u00ad/g, '')
        .replace(/\s+/g, ' ')
        .trim(),
      x0: group[0].x,
      x1: last.x + last.width,
      y: group[0].y,
      size
    }
  })

  const chars = lines.reduce((sum, line) => sum + line.text.length, 0)
  return { page: pageNumber, height: top - bottom, lines, chars }
}

// --- Step 2: work out what "normal" body text looks like --------------------

function mostCommonSize(pages: PageText[]): number {
  const counts = new Map<number, number>()
  for (const page of pages) {
    for (const line of page.lines) {
      const size = Math.round(line.size * 2) / 2
      counts.set(size, (counts.get(size) ?? 0) + line.text.length)
    }
  }
  let best = 10
  let bestCount = -1
  for (const [size, count] of counts) {
    if (count > bestCount) {
      best = size
      bestCount = count
    }
  }
  return best
}

// --- Step 3: remove running headers and page numbers -----------------------

function removeHeadersAndFooters(pages: PageText[], bodySize: number): void {
  const normalise = (text: string): string =>
    text.toLowerCase().replace(/\d+/g, '#').replace(/\s+/g, ' ').trim()
  const isPageNumber = (text: string): boolean =>
    text.length <= 8 && /^[#ivxlcdm\s.\-–—|]+$/.test(normalise(text))

  // Lines at the very top or bottom of a page, in smaller or shorter type than the body
  const edgeLines = (page: PageText): Line[] => {
    const edges: Line[] = []
    const first = page.lines[0]
    const last = page.lines[page.lines.length - 1]
    if (first && page.height - first.y < page.height * 0.13) edges.push(first)
    if (last && last !== first && last.y < page.height * 0.13) edges.push(last)
    return edges
  }

  const counts = new Map<string, number>()
  for (const page of pages) {
    for (const line of edgeLines(page)) {
      const key = normalise(line.text)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }

  const repeatThreshold = Math.max(3, pages.length * 0.1)
  for (const page of pages) {
    const remove = new Set<Line>()
    for (const line of edgeLines(page)) {
      const repeated = (counts.get(normalise(line.text)) ?? 0) >= repeatThreshold
      const looksLikeFurniture =
        line.size < bodySize * 0.95 || line.text.length < 60 || isPageNumber(line.text)
      if (isPageNumber(line.text) || (repeated && looksLikeFurniture)) remove.add(line)
    }
    if (remove.size > 0) {
      page.lines = page.lines.filter((line) => !remove.has(line))
      page.chars = page.lines.reduce((sum, line) => sum + line.text.length, 0)
    }
  }
}

// --- Step 4: rebuild headings and paragraphs -------------------------------

// Joins two lines, undoing hyphens that were only there because a word was split
function joinLines(a: string, b: string): string {
  if (/[a-z][-\u2010]$/i.test(a) && /^[a-z]/.test(b)) return a.slice(0, -1) + b
  return `${a} ${b}`
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

async function buildBlocks(doc: PdfDoc, pages: PageText[], bodySize: number): Promise<Block[]> {
  const blocks: Block[] = []
  let paragraph: { text: string; page: number; endPage: number } | null = null
  let paragraphEnded = true
  let dropCap = ''

  const finishParagraph = (): void => {
    if (paragraph)
      blocks.push({
        kind: 'paragraph',
        text: paragraph.text,
        page: paragraph.page,
        endPage: paragraph.endPage,
        offset: 0
      })
    paragraph = null
  }

  for (const page of pages) {
    // The cover, and pages with (almost) no text: keep them as pictures
    if (page.page === 1 || page.chars < 10) {
      finishParagraph()
      paragraphEnded = true
      if (await pageHasInk(doc, page.page)) {
        blocks.push({ kind: 'image', text: '', page: page.page, endPage: page.page, offset: 0 })
      }
      continue
    }

    const body = page.lines.filter((line) => Math.abs(line.size - bodySize) < bodySize * 0.12)
    const reference = body.length > 0 ? body : page.lines
    const left = Math.min(...reference.map((line) => line.x0))
    const right = Math.max(...reference.map((line) => line.x1))
    const width = right - left
    const gaps = body
      .slice(1)
      .map((line, i) => body[i].y - line.y)
      .filter((gap) => gap > 0)
    const lineGap = median(gaps) || bodySize * 1.4

    let previous: Line | null = null
    let previousWasHeading = false

    for (const line of page.lines) {
      const isHeading = line.size >= bodySize * 1.18
      const indent = line.x0 - left
      const roomOnRight = right - line.x1
      const isCentred = indent > line.size * 2 && Math.abs(indent - roomOnRight) < line.size * 1.5

      if (isHeading && line.text.length <= 2) {
        // A big decorative first letter (drop cap): glue it onto the next line
        dropCap = line.text
        previous = line
        continue
      }

      if (isHeading) {
        finishParagraph()
        const last = blocks[blocks.length - 1]
        if (previousWasHeading && last?.kind === 'heading') last.text += `\n${line.text}`
        else
          blocks.push({
            kind: 'heading',
            text: line.text,
            page: page.page,
            endPage: page.page,
            offset: 0
          })
        previousWasHeading = true
        paragraphEnded = true
        previous = line
        continue
      }
      previousWasHeading = false

      const text = dropCap ? dropCap + line.text : line.text
      dropCap = ''

      if (isCentred && line.x1 - line.x0 < width * 0.6) {
        // Short centred lines, e.g. "* * *" scene breaks
        finishParagraph()
        blocks.push({ kind: 'scene', text, page: page.page, endPage: page.page, offset: 0 })
        paragraphEnded = true
        previous = line
        continue
      }

      const bigGap = previous !== null && previous.y - line.y > lineGap * 1.45
      const indented = indent > line.size * 0.6
      if (!paragraph || paragraphEnded || indented || bigGap) {
        finishParagraph()
        paragraph = { text, page: page.page, endPage: page.page }
      } else {
        paragraph.text = joinLines(paragraph.text, text)
        paragraph.endPage = page.page
      }

      // A line that stops well short of the right margin ends its paragraph
      paragraphEnded = roomOnRight > width * 0.15
      previous = line
    }
  }
  finishParagraph()
  return blocks
}

// --- Step 5: split into sections and count characters ----------------------

function blockLength(block: Block): number {
  return block.kind === 'image' ? 400 : block.text.length
}

function buildSections(blocks: Block[]): Section[] {
  const sections: Section[] = []
  let start = 0
  let chars = 0
  blocks.forEach((block, i) => {
    const newChapter = block.kind === 'heading' && chars > 1500
    const tooLong = block.kind === 'paragraph' && chars > 30000
    if (i > start && (newChapter || tooLong)) {
      sections.push({ start, end: i })
      start = i
      chars = 0
    }
    chars += blockLength(block)
  })
  if (blocks.length > start) sections.push({ start, end: blocks.length })
  return sections
}

export async function extractBook(
  doc: PdfDoc,
  onProgress?: (fraction: number) => void
): Promise<ReflowBook> {
  const pages: PageText[] = []
  for (let first = 1; first <= doc.numPages; first += 8) {
    const last = Math.min(first + 7, doc.numPages)
    const numbers = Array.from({ length: last - first + 1 }, (_, i) => first + i)
    pages.push(...(await Promise.all(numbers.map((n) => readPage(doc, n)))))
    onProgress?.(pages.length / doc.numPages)
  }

  const pagesWithText = pages.filter((page) => page.chars > 50).length
  const hasText = pagesWithText >= Math.max(1, doc.numPages * 0.3)
  if (!hasText) return { blocks: [], sections: [], totalChars: 0, hasText: false }

  const bodySize = mostCommonSize(pages)
  removeHeadersAndFooters(pages, bodySize)
  const blocks = await buildBlocks(doc, pages, bodySize)

  let offset = 0
  for (const block of blocks) {
    block.offset = offset
    offset += blockLength(block)
  }

  return { blocks, sections: buildSections(blocks), totalChars: Math.max(1, offset), hasText }
}

// Each book is only prepared once while the app is open
const prepared = new Map<string, Promise<ReflowBook>>()

export function getReflowBook(
  key: string,
  doc: PdfDoc,
  onProgress?: (fraction: number) => void
): Promise<ReflowBook> {
  let book = prepared.get(key)
  if (!book) {
    book = extractBook(doc, onProgress)
    book.catch(() => prepared.delete(key))
    prepared.set(key, book)
  }
  return book
}

// The first block that starts on (or after) a PDF page, used when switching modes
export function blockForPage(book: ReflowBook, page: number): number {
  const index = book.blocks.findIndex((block) => block.page >= page)
  return index === -1 ? Math.max(0, book.blocks.length - 1) : index
}
