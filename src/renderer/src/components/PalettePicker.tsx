import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, ChevronDown } from 'lucide-react'
import { PALETTES, getPalette } from '../lib/palettes'
import { EASE_OUT } from '../lib/motion'
import Swatches from './Swatches'

type Props = {
  value: string // the saved palette id
  onPreview: (id: string | null) => void // show a palette on the calendar while choosing (null = stop)
  onChange: (id: string) => void // save a new choice
}

// A dropdown of every colour scheme with its shades. Clicking one previews it on the
// calendar; Done keeps it, Cancel (or Esc, or clicking elsewhere) goes back.
export default function PalettePicker({ value, onPreview, onChange }: Props): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [choice, setChoice] = useState(value)
  const container = useRef<HTMLDivElement>(null)

  const openPicker = (): void => {
    setChoice(value)
    setOpen(true)
  }

  const cancel = useCallback(() => {
    onPreview(null)
    setOpen(false)
  }, [onPreview])

  const done = (): void => {
    onChange(choice)
    onPreview(null)
    setOpen(false)
  }

  const pick = (id: string): void => {
    setChoice(id)
    onPreview(id)
  }

  // Esc or a click outside the picker cancels
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') cancel()
    }
    const onPointer = (e: MouseEvent): void => {
      if (!container.current?.contains(e.target as Node)) cancel()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onPointer)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onPointer)
    }
  }, [open, cancel])

  return (
    <div ref={container} className="relative">
      <button
        type="button"
        onClick={open ? cancel : openPicker}
        aria-expanded={open}
        className="flex items-center gap-2.5 rounded-full border border-white/10 py-1.5 pr-3 pl-3.5 text-sm text-neutral-300 transition hover:bg-white/5 hover:text-white"
      >
        <Swatches palette={getPalette(value)} size={10} />
        Colours
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Calendar colours"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
            className="absolute top-full right-0 z-20 mt-2 w-72 origin-top-right rounded-2xl bg-neutral-900/95 p-2 shadow-2xl ring-1 shadow-black/50 ring-white/10 backdrop-blur-md"
          >
            <p className="px-3 pt-2 pb-1 text-[11px] font-medium tracking-[0.16em] text-neutral-500 uppercase">
              Calendar colours
            </p>
            <div role="radiogroup">
              {PALETTES.map((palette) => {
                const selected = palette.id === choice
                return (
                  <button
                    key={palette.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => pick(palette.id)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-sm transition-colors ${
                      selected
                        ? 'bg-white/10 text-white'
                        : 'text-neutral-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Check size={14} className={selected ? 'opacity-100' : 'opacity-0'} />
                      {palette.name}
                    </span>
                    <Swatches palette={palette} />
                  </button>
                )
              })}
            </div>
            <div className="mt-2 flex justify-end gap-2 border-t border-white/5 px-1 pt-2">
              <button
                type="button"
                onClick={cancel}
                className="rounded-full px-3.5 py-1.5 text-sm text-neutral-400 transition hover:bg-white/10 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={done}
                className="rounded-full bg-white px-4 py-1.5 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
              >
                Done
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
