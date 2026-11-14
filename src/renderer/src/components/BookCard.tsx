import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { getCover } from '../lib/pdf'
import { getProgress, percentRead } from '../lib/progress'
import { EASE_OUT } from '../lib/motion'

type Props = {
  book: Book
  index: number
  onOpen: () => void
}

export default function BookCard({ book, index, onOpen }: Props): React.JSX.Element {
  const [cover, setCover] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    getCover(book)
      .then((url) => alive && setCover(url))
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [book])

  const percent = percentRead(getProgress(book.id))

  return (
    <motion.button
      type="button"
      onDoubleClick={onOpen}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE_OUT, delay: Math.min(index, 12) * 0.04 }}
      className="group text-left outline-none"
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-neutral-900 shadow-lg ring-1 shadow-black/40 ring-white/10 transition duration-300 ease-out group-hover:-translate-y-1 group-hover:shadow-xl group-hover:shadow-black/60 group-focus-visible:ring-2 group-focus-visible:ring-white/60">
        {cover ? (
          <motion.img
            src={cover}
            alt=""
            draggable={false}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full animate-pulse bg-neutral-800/60" />
        )}

        {percent > 0 && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-black/50">
            <div className="h-full bg-white/80" style={{ width: `${percent}%` }} />
          </div>
        )}
      </div>

      <p className="mt-3 line-clamp-2 text-sm font-medium text-neutral-200">{book.title}</p>
      <p className="mt-0.5 text-xs text-neutral-500">{percent > 0 ? `${percent}%` : 'New'}</p>
    </motion.button>
  )
}
