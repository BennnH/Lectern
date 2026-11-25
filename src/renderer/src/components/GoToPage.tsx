import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { EASE_OUT } from '../lib/motion'

type Props = {
  firstPage: number // the PDF pages on screen now (two in reflow mode if a screen spans a break)
  lastPage: number
  total: number
  onGo: (page: number) => void
  onClose: () => void
}

// A small box above the toolbar: type a page number and press Enter to jump there.
// Esc or clicking anywhere else closes it.
export default function GoToPage({
  firstPage,
  lastPage,
  total,
  onGo,
  onClose
}: Props): React.JSX.Element {
  const [text, setText] = useState('')
  const [invalid, setInvalid] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  // Clicking anywhere outside the box closes it
  useEffect(() => {
    const onPointer = (e: MouseEvent): void => {
      if (!box.current?.contains(e.target as Node)) onClose()
    }
    window.addEventListener('mousedown', onPointer)
    return () => window.removeEventListener('mousedown', onPointer)
  }, [onClose])

  const go = (): void => {
    const page = Number(text)
    if (!Number.isInteger(page) || page < 1 || page > total) {
      setInvalid(true)
      return
    }
    onGo(page)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') go()
    if (e.key === 'Escape') onClose()
  }

  const current = firstPage === lastPage ? `page ${firstPage}` : `pages ${firstPage}–${lastPage}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.98 }}
      transition={{ duration: 0.18, ease: EASE_OUT }}
      className="pointer-events-none absolute inset-x-0 bottom-20 z-[70] flex justify-center"
    >
      <div
        ref={box}
        role="dialog"
        aria-label="Go to page"
        className="pointer-events-auto w-72 rounded-2xl bg-neutral-900/95 p-4 shadow-2xl ring-1 shadow-black/40 ring-white/10 backdrop-blur-md"
      >
        <p className="text-sm font-medium text-neutral-100">Go to page</p>
        <div className="mt-3 flex items-center gap-2">
          <input
            type="text"
            inputMode="numeric"
            autoFocus
            aria-label="Page number"
            placeholder={String(firstPage)}
            value={text}
            onChange={(e) => {
              setText(e.target.value.replace(/\D/g, '')) // digits only
              setInvalid(false)
            }}
            onKeyDown={onKeyDown}
            className={`w-20 rounded-lg bg-white/5 px-3 py-1.5 text-center text-sm text-neutral-100 tabular-nums ring-1 outline-none placeholder:text-neutral-600 focus:ring-white/30 ${
              invalid ? 'ring-red-400/70' : 'ring-white/10'
            }`}
          />
          <span className="text-sm text-neutral-500 tabular-nums">of {total}</span>
          <button
            type="button"
            onClick={go}
            className="ml-auto rounded-full bg-white px-4 py-1.5 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
          >
            Go
          </button>
        </div>
        <p className={`mt-2 text-xs ${invalid ? 'text-red-400' : 'text-neutral-500'}`}>
          {invalid ? `Enter a page from 1 to ${total}` : `You're on ${current}`}
        </p>
      </div>
    </motion.div>
  )
}
