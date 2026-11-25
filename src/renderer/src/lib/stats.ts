// Reading statistics: tracking a session while you read, and adding sessions up afterwards.

// Time on a screen only counts as reading if it's between these two lengths.
// Quicker than 3 seconds is flicking through; longer than 5 minutes is a break.
export const MIN_TURN_MS = 3_000
export const MAX_TURN_MS = 5 * 60_000

// A page only counts as read once you've spent this long on it (adding up all its screens),
// so flicking through to find your place doesn't add pages
export const MIN_PAGE_MS = 7_000

// A session is only kept if you read at least a page, or for at least this long
const MIN_SESSION_MS = 60_000

// How far through a book a page is (0 to 1): page 1 is 0%, the last page is 100%
export function fractionAt(page: number, total: number): number {
  return total <= 1 ? 1 : (page - 1) / (total - 1)
}

export function isWorthKeeping(session: ReadingSession): boolean {
  return session.pagesRead >= 1 || session.activeMs >= MIN_SESSION_MS
}

// Follows one reading session while a book is open
export class SessionTracker {
  readonly session: ReadingSession
  private lastTurn: number
  // The PDF pages on the screen you're looking at (in reflow mode one screen can show text
  // from more than one page; with original pages it's always one)
  private screen: { first: number; last: number }
  // How long each page has been on screen this session, and the pages that count as read
  private timeOnPage = new Map<number, number>()
  private pagesCounted = new Set<number>()

  constructor(book: Book, page: number, totalPages: number) {
    const now = Date.now()
    this.lastTurn = now
    this.screen = { first: page, last: page }
    this.session = {
      id: `${now}-${book.fingerprint}`,
      bookId: book.fingerprint,
      title: book.title,
      start: now,
      end: now,
      activeMs: 0,
      startPage: page,
      endPage: page,
      furthestPage: page,
      totalPages,
      pagesRead: 0,
      seen: false
    }
  }

  // Call whenever the screen changes, with the pages now on screen. Adds the time spent on
  // the screen you just left to each page it showed. A page counts once it's off the screen
  // (forwards or back), if it was on screen long enough in total. Each page counts once per
  // session, so going back to re-read it doesn't count it twice.
  turn(firstPage: number, lastPage = firstPage): void {
    const now = Date.now()
    const gap = now - this.lastTurn
    if (gap >= MIN_TURN_MS && gap <= MAX_TURN_MS) this.session.activeMs += gap
    const { first, last } = this.screen
    for (let page = first; page <= last; page += 1) {
      this.addTimeOnPage(page, gap)
      if (page < firstPage || page > lastPage) this.countIfRead(page)
    }
    this.screen = { first: firstPage, last: Math.max(firstPage, lastPage) }
    this.lastTurn = now
    this.session.end = now
    this.session.endPage = firstPage
    this.session.furthestPage = Math.max(this.session.furthestPage, lastPage)
  }

  // Call when the book is closed: counts the time on the last screen. The pages you stop on
  // aren't counted yet, as the book opens there next time and they count once you move on.
  // The book's last page is the exception, since there's nowhere to move on to.
  finish(): void {
    const { first, last } = this.screen
    this.turn(first, last)
    if (last === this.session.totalPages) {
      for (let page = first; page <= last; page += 1) this.countIfRead(page)
    }
  }

  private addTimeOnPage(page: number, gap: number): void {
    // A gap longer than MAX_TURN_MS is a break, but you still read the page before it
    const time = (this.timeOnPage.get(page) ?? 0) + Math.min(gap, MAX_TURN_MS)
    this.timeOnPage.set(page, time)
  }

  private countIfRead(page: number): void {
    if ((this.timeOnPage.get(page) ?? 0) >= MIN_PAGE_MS) this.pagesCounted.add(page)
    this.session.pagesRead = this.pagesCounted.size
  }

  // Reading time so far, including the screen you're on now (for the live panel).
  // Uses the same rules as turn(), so it always matches the final recap.
  liveActiveMs(): number {
    const gap = Date.now() - this.lastTurn
    return this.session.activeMs + (gap >= MIN_TURN_MS && gap <= MAX_TURN_MS ? gap : 0)
  }
}

// "42 min", "1 h 5 m", or "35 s" for very short times
export function formatDuration(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)} s`
  const minutes = Math.round(ms / 60_000)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours} h ${rest} m` : `${hours} h`
}

// Your reading speed for a book (pages an hour) across all its sessions.
// Null until there's enough reading to give a fair number.
export function pagesPerHour(sessions: ReadingSession[], bookId: string): number | null {
  let pages = 0
  let ms = 0
  for (const session of sessions) {
    if (session.bookId !== bookId) continue
    pages += session.pagesRead
    ms += session.activeMs
  }
  if (ms < 10 * 60_000 || pages < 5) return null
  return pages / (ms / 3_600_000)
}

// A day as text, e.g. "2026-11-14", using your local time zone (for grouping by day)
export function dayKey(time: number): string {
  const d = new Date(time)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

export type DayTotals = {
  pages: number
  activeMs: number
  sessions: number
}

// Pages, reading time and session count for every day you've read
export function totalsByDay(sessions: ReadingSession[]): Map<string, DayTotals> {
  const days = new Map<string, DayTotals>()
  for (const session of sessions) {
    if (!isWorthKeeping(session)) continue
    const key = dayKey(session.start)
    const totals = days.get(key) ?? { pages: 0, activeMs: 0, sessions: 0 }
    totals.pages += session.pagesRead
    totals.activeMs += session.activeMs
    totals.sessions += 1
    days.set(key, totals)
  }
  return days
}

// Today's pages and reading time (null if you haven't read yet today)
export function todayTotals(sessions: ReadingSession[]): DayTotals | null {
  return totalsByDay(sessions).get(dayKey(Date.now())) ?? null
}

// How many days in a row you've read, up to today. Not having read yet today
// doesn't break the streak until the day is over.
export function currentStreak(sessions: ReadingSession[]): number {
  const days = totalsByDay(sessions)
  const cursor = new Date()
  if (!days.has(dayKey(cursor.getTime()))) cursor.setDate(cursor.getDate() - 1)
  let streak = 0
  while (days.has(dayKey(cursor.getTime()))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

// The day after a day key, e.g. "2026-11-30" → "2026-12-01"
function nextDayKey(key: string): string {
  const [year, month, day] = key.split('-').map(Number)
  return dayKey(new Date(year, month - 1, day + 1).getTime())
}

// Your longest run of days in a row with some reading, ever
export function longestStreak(sessions: ReadingSession[]): number {
  const days = [...totalsByDay(sessions).keys()].sort()
  let longest = 0
  let run = 0
  let previous: string | null = null
  for (const day of days) {
    run = previous !== null && day === nextDayKey(previous) ? run + 1 : 1
    longest = Math.max(longest, run)
    previous = day
  }
  return longest
}
