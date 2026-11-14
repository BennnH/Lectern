import { useEffect, useState, type RefObject } from 'react'

// Microphone level meters. The level changes ten times a second, so each meter reads it
// on its own timer rather than making the whole reader redraw.

function useLiveLevel(level: RefObject<number>): number {
  const [value, setValue] = useState(0)
  useEffect(() => {
    const timer = window.setInterval(() => setValue(level.current), 100)
    return () => window.clearInterval(timer)
  }, [level])
  return value
}

// Five small bars, for the listening indicator
export function LevelBars({ level }: { level: RefObject<number> }): React.JSX.Element {
  const value = useLiveLevel(level)
  return (
    <div className="flex h-3 items-end gap-[2px]">
      {[0.15, 0.3, 0.45, 0.6, 0.75].map((threshold, i) => (
        <span
          key={threshold}
          className={`w-[3px] rounded-full transition-colors duration-100 ${value > threshold ? 'bg-emerald-400' : 'bg-white/15'}`}
          style={{ height: `${40 + i * 15}%` }}
        />
      ))}
    </div>
  )
}

// One long bar, for the voice panel
export function LevelBar({ level }: { level: RefObject<number> }): React.JSX.Element {
  const value = useLiveLevel(level)
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
      <div
        className="h-full rounded-full bg-emerald-400 transition-[width] duration-100"
        style={{ width: `${Math.round(value * 100)}%` }}
      />
    </div>
  )
}
