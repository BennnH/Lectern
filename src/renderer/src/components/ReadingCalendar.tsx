import { useRef, useState } from 'react'
import type { Calendar, CalendarDay } from '../lib/calendar'
import { shade, type Palette } from '../lib/palettes'
import { formatDuration } from '../lib/stats'

type Props = {
  calendar: Calendar
  palette: Palette
}

// Sizes in the drawing's own units. The whole drawing scales to fit the page width.
const CELL = 11
const GAP = 3
const STEP = CELL + GAP
const LEFT = 30 // room for the day names
const TOP = 18 // room for the month names
const WIDTH = LEFT + 53 * STEP - GAP
const HEIGHT = TOP + 7 * STEP - GAP

// Only some rows are labelled, like GitHub, so it doesn't look crowded
const DAY_LABELS: [number, string][] = [
  [0, 'Mon'],
  [2, 'Wed'],
  [4, 'Fri']
]

function describe(day: CalendarDay): string {
  const date = day.date.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
  if (day.level === 0) return `No reading · ${date}`
  const pages = `${day.pages} ${day.pages === 1 ? 'page' : 'pages'}`
  return `${pages}, ${formatDuration(day.activeMs)} · ${date}`
}

// A year of reading, one square per day. Brighter squares are bigger reading days.
export default function ReadingCalendar({ calendar, palette }: Props): React.JSX.Element {
  const container = useRef<HTMLDivElement>(null)
  // The day under the mouse, and where to show its label
  const [hovered, setHovered] = useState<{
    day: CalendarDay
    week: number
    x: number
    y: number
  } | null>(null)

  const hover = (day: CalendarDay, week: number, target: SVGRectElement): void => {
    const box = target.getBoundingClientRect()
    const area = container.current!.getBoundingClientRect()
    setHovered({ day, week, x: box.left + box.width / 2 - area.left, y: box.top - area.top })
  }

  // Near the edges the label lines up with the square instead of centring on it,
  // so it never hangs off the side of the page
  const labelShift = !hovered
    ? ''
    : hovered.week < 6
      ? '-translate-x-3'
      : hovered.week > 46
        ? '-translate-x-[calc(100%-12px)]'
        : '-translate-x-1/2'

  return (
    <div ref={container} className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="block w-full"
        role="img"
        aria-label={`Reading calendar: ${calendar.totals.days} days read in the last year`}
        onMouseLeave={() => setHovered(null)}
      >
        {calendar.months.map(({ week, label }) => (
          <text
            key={`${week}-${label}`}
            x={LEFT + week * STEP}
            y={10}
            className="fill-neutral-500 text-[9px]"
          >
            {label}
          </text>
        ))}
        {DAY_LABELS.map(([row, label]) => (
          <text
            key={label}
            x={0}
            y={TOP + row * STEP + CELL - 2}
            className="fill-neutral-500 text-[9px]"
          >
            {label}
          </text>
        ))}
        {calendar.weeks.map((column, week) =>
          column.map((day, row) =>
            day.future ? null : (
              <rect
                key={day.key}
                x={LEFT + week * STEP}
                y={TOP + row * STEP}
                width={CELL}
                height={CELL}
                rx={2}
                fill={shade(palette, day.level)}
                stroke={hovered?.day.key === day.key ? 'rgba(255,255,255,0.7)' : 'none'}
                strokeWidth={1}
                style={{ transition: 'fill 200ms' }}
                onMouseEnter={(e) => hover(day, week, e.currentTarget)}
              />
            )
          )
        )}
      </svg>

      {hovered && (
        <div
          className={`pointer-events-none absolute z-10 -translate-y-full rounded-lg ${labelShift} bg-neutral-800 px-2.5 py-1.5 text-xs whitespace-nowrap text-neutral-100 shadow-lg ring-1 ring-white/10`}
          style={{ left: hovered.x, top: hovered.y - 6 }}
        >
          {describe(hovered.day)}
        </div>
      )}
    </div>
  )
}
