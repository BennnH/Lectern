import { dayKey, type DayTotals } from './stats'

// The reading calendar: a year of days laid out like GitHub's contribution graph.
// Each column is a week (oldest on the left) and each row a day, Monday at the top.

export const WEEKS = 53
// Shades for reading days. 0 is a day with no reading; 1–4 get brighter.
export const LEVELS = 4

export type CalendarDay = {
  key: string // "2026-11-14"
  date: Date
  pages: number
  activeMs: number
  level: number // 0 = no reading, 1–4 = how big a reading day it was
  future: boolean // later this week (not happened yet)
}

export type MonthLabel = { week: number; label: string }

export type Calendar = {
  weeks: CalendarDay[][] // weeks[week][day], day 0 = Monday … 6 = Sunday
  months: MonthLabel[] // where each month starts, for the labels along the top
  totals: { pages: number; days: number; activeMs: number }
}

// Monday of the week containing `date`, at midnight
function startOfWeek(date: Date): Date {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  return monday
}

// Turns pages read into a shade. Each reading day is ranked against your other reading
// days, so the brightest quarter are your biggest days. Ranking (rather than comparing
// with your single best day) stops one huge day making every other day look faint.
export function levelScale(pagesOnReadingDays: number[]): (pages: number) => number {
  const sorted = pagesOnReadingDays.filter((p) => p > 0).sort((a, b) => a - b)
  return (pages) => {
    if (pages <= 0 || sorted.length === 0) return 0
    // How many reading days had this many pages or fewer
    let rank = 0
    while (rank < sorted.length && sorted[rank] <= pages) rank += 1
    return Math.max(1, Math.ceil((LEVELS * rank) / sorted.length))
  }
}

// Builds the last 53 weeks, ending with the current week
export function buildCalendar(days: Map<string, DayTotals>, today = new Date()): Calendar {
  const todayKey = dayKey(today.getTime())
  const cursor = startOfWeek(today)
  cursor.setDate(cursor.getDate() - (WEEKS - 1) * 7)

  // First pass: every day's totals
  const weeks: CalendarDay[][] = []
  for (let week = 0; week < WEEKS; week += 1) {
    const column: CalendarDay[] = []
    for (let day = 0; day < 7; day += 1) {
      const key = dayKey(cursor.getTime())
      const totals = days.get(key)
      column.push({
        key,
        date: new Date(cursor),
        pages: totals?.pages ?? 0,
        activeMs: totals?.activeMs ?? 0,
        // A day you read without finishing a page still counts (like streaks do)
        level: totals ? 1 : 0,
        future: key > todayKey
      })
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(column)
  }

  // Second pass: shades, now that every reading day in view is known
  const shown = weeks.flat().filter((d) => !d.future && d.level > 0)
  const scale = levelScale(shown.map((d) => d.pages))
  for (const day of shown) day.level = Math.max(1, scale(day.pages))

  return {
    weeks,
    months: monthLabels(weeks),
    totals: {
      pages: shown.reduce((sum, d) => sum + d.pages, 0),
      days: shown.length,
      activeMs: shown.reduce((sum, d) => sum + d.activeMs, 0)
    }
  }
}

// A label above the week each month starts in (and the first column, if there's room)
function monthLabels(weeks: CalendarDay[][]): MonthLabel[] {
  const name = (date: Date): string => date.toLocaleDateString(undefined, { month: 'short' })
  const labels: MonthLabel[] = []
  weeks.forEach((column, week) => {
    const first = column.find((d) => d.date.getDate() === 1)
    if (first) labels.push({ week, label: name(first.date) })
  })
  if (labels.length === 0 || labels[0].week >= 3) {
    labels.unshift({ week: 0, label: name(weeks[0][0].date) })
  }
  return labels
}
