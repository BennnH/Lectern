import { useMemo, useState } from 'react'
import { buildCalendar } from '../lib/calendar'
import { getPalette } from '../lib/palettes'
import { getSettings, updateSettings } from '../lib/settings'
import { currentStreak, longestStreak, todayTotals, totalsByDay } from '../lib/stats'
import { getSessions } from '../lib/store'
import DailyGoal from './DailyGoal'
import { PageLayout, Stat } from './Page'
import ReadingCalendar from './ReadingCalendar'
import PalettePicker from './PalettePicker'
import Swatches from './Swatches'

const days = (n: number): string => `${n} ${n === 1 ? 'day' : 'days'}`

// Your reading over the last year: headline numbers and the reading calendar
export default function StatsPage(): React.JSX.Element {
  // Worked out once each time you open the page
  const stats = useMemo(() => {
    const sessions = getSessions()
    return {
      calendar: buildCalendar(totalsByDay(sessions)),
      current: currentStreak(sessions),
      longest: longestStreak(sessions),
      pagesToday: todayTotals(sessions)?.pages ?? 0
    }
  }, [])
  const { calendar } = stats

  const [paletteId, setPaletteId] = useState(() => getSettings().calendarPalette)
  // A colour scheme being tried out in the picker (shown until you press Done or Cancel)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const palette = getPalette(previewId ?? paletteId)

  const choosePalette = (id: string): void => {
    setPaletteId(id)
    updateSettings({ calendarPalette: id })
  }

  return (
    <PageLayout title="Reading stats" subtitle="Your reading over the last year" wide>
      <div className="mb-8 grid grid-cols-2 gap-6 lg:grid-cols-4">
        <Stat value={calendar.totals.pages.toLocaleString()} label="pages in the last year" />
        <Stat value={days(calendar.totals.days)} label="with some reading" />
        <Stat value={days(stats.current)} label="current streak" />
        <Stat value={days(stats.longest)} label="longest streak" />
      </div>

      <DailyGoal pagesToday={stats.pagesToday} colour={palette.colour} />
      <div className="rounded-2xl bg-white/[0.03] p-5 ring-1 ring-white/5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-[11px] font-medium tracking-[0.16em] text-neutral-500 uppercase">
            Reading calendar
          </h2>
          <PalettePicker value={paletteId} onPreview={setPreviewId} onChange={choosePalette} />
        </div>

        <ReadingCalendar calendar={calendar} palette={palette} />

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-500">
          <p>
            {calendar.totals.days === 0
              ? 'Read a few pages and today will light up.'
              : 'Brighter squares are days you read more pages.'}
          </p>
          <span className="flex items-center gap-2">
            Less
            <Swatches palette={palette} size={10} />
            More
          </span>
        </div>
      </div>
    </PageLayout>
  )
}
