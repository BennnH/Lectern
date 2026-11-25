import { useState } from 'react'
import { Check, Pencil, Target } from 'lucide-react'
import { getSettings, updateSettings } from '../lib/settings'

type Props = {
  pagesToday: number
  colour: string // the reading calendar's colour, used for the progress bar
}

const CARD =
  'mb-6 flex items-center gap-4 rounded-2xl bg-white/[0.03] px-5 py-4 ring-1 ring-white/5'
const ICON = 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5'
const BUTTON =
  'rounded-full px-4 py-1.5 text-sm text-neutral-300 transition hover:bg-white/10 hover:text-white'

// Your daily reading goal, above the reading calendar: set one, see today's progress, or change it
export default function DailyGoal({ pagesToday, colour }: Props): React.JSX.Element {
  const [goal, setGoal] = useState(() => getSettings().dailyGoal)
  const [editing, setEditing] = useState(false)
  // What's typed in the box while editing
  const [draft, setDraft] = useState('')

  const startEditing = (): void => {
    setDraft(goal === null ? '' : String(goal))
    setEditing(true)
  }

  const save = (newGoal: number | null): void => {
    setGoal(newGoal)
    updateSettings({ dailyGoal: newGoal })
    setEditing(false)
  }

  const typed = Number(draft)
  const valid = draft !== '' && typed >= 1

  if (editing) {
    return (
      <form
        className={CARD}
        onSubmit={(e) => {
          e.preventDefault()
          if (valid) save(typed)
        }}
      >
        <span className={`${ICON} text-neutral-400`}>
          <Target size={16} />
        </span>
        <label htmlFor="daily-goal" className="text-sm text-neutral-200">
          Daily goal
        </label>
        <input
          id="daily-goal"
          autoFocus
          value={draft}
          placeholder="50"
          inputMode="numeric"
          maxLength={4}
          // Numbers only
          onChange={(e) => setDraft(e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setEditing(false)
          }}
          className="w-20 rounded-lg bg-black/30 px-3 py-1.5 text-sm text-neutral-100 tabular-nums ring-1 ring-white/10 outline-none placeholder:text-neutral-600 focus:ring-white/30"
        />
        <span className="text-sm text-neutral-500">pages a day</span>
        <div className="ml-auto flex items-center gap-1">
          {goal !== null && (
            <button type="button" onClick={() => save(null)} className={BUTTON}>
              Turn off
            </button>
          )}
          <button type="button" onClick={() => setEditing(false)} className={BUTTON}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={!valid}
            className="rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-neutral-100 transition hover:bg-white/15 disabled:opacity-40 disabled:hover:bg-white/10"
          >
            Save
          </button>
        </div>
      </form>
    )
  }

  if (goal === null) {
    return (
      <div className={CARD}>
        <span className={`${ICON} text-neutral-400`}>
          <Target size={16} />
        </span>
        <div>
          <p className="text-sm text-neutral-200">Set a daily reading goal</p>
          <p className="text-xs text-neutral-500">Choose how many pages to aim for each day.</p>
        </div>
        <button
          type="button"
          onClick={startEditing}
          className="ml-auto rounded-full border border-white/10 px-4 py-1.5 text-sm text-neutral-300 transition hover:bg-white/5 hover:text-white"
        >
          Set goal
        </button>
      </div>
    )
  }

  const reached = pagesToday >= goal
  return (
    <div className={CARD}>
      <span className={ICON} style={{ color: reached ? colour : undefined }}>
        {reached ? <Check size={16} /> : <Target size={16} className="text-neutral-400" />}
      </span>
      <p className="text-sm whitespace-nowrap text-neutral-500 tabular-nums">
        <span className="font-medium text-neutral-100">{pagesToday}</span> / {goal} pages today
      </p>
      <div
        role="progressbar"
        aria-label="Today's pages"
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={Math.min(pagesToday, goal)}
        className="h-1.5 min-w-16 flex-1 overflow-hidden rounded-full bg-white/5"
      >
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${Math.min(pagesToday / goal, 1) * 100}%`, backgroundColor: colour }}
        />
      </div>
      <p className="text-xs whitespace-nowrap text-neutral-500 tabular-nums">
        {reached ? 'Goal reached' : `${goal - pagesToday} to go`}
      </p>
      <button
        type="button"
        onClick={startEditing}
        title="Change daily goal"
        aria-label="Change daily goal"
        className="-mr-2 rounded-full p-2 text-neutral-500 transition hover:bg-white/10 hover:text-white"
      >
        <Pencil size={14} />
      </button>
    </div>
  )
}
