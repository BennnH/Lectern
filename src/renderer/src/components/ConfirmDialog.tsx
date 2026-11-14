import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { TriangleExclamationPoint } from 'lucide-react'
import { EASE_OUT } from '../lib/motion'

type Props = {
  title: string // e.g. "Delete all data?"
  details: string // what exactly will be deleted
  confirmLabel: string // the final button, e.g. "Delete everything"
  onConfirm: () => Promise<void>
  onCancel: () => void
}

// Asks twice before doing something that can't be undone:
// first explains what will happen, then asks "are you sure?"
export default function ConfirmDialog({
  title,
  details,
  confirmLabel,
  onConfirm,
  onCancel
}: Props): React.JSX.Element {
  const [step, setStep] = useState<'explain' | 'sure'>('explain')
  const [busy, setBusy] = useState(false)

  // Esc cancels. Cancel starts with keyboard focus, so pressing Enter cancels too:
  // the only way to confirm is to click the red button on the second step.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  const confirm = async (): Promise<void> => {
    setBusy(true)
    try {
      await onConfirm()
    } finally {
      setBusy(false)
    }
  }

  return (
    <motion.div
      className="app-no-drag fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={busy ? undefined : onCancel}
    >
      <motion.div
        role="alertdialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 6, scale: 0.98 }}
        transition={{ duration: 0.3, ease: EASE_OUT }}
        className="w-[420px] max-w-[92vw] rounded-2xl bg-neutral-900/95 p-6 shadow-2xl ring-1 shadow-black/50 ring-white/10"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 text-red-400">
          <TriangleExclamationPoint size={18} />
        </span>

        {step === 'explain' ? (
          <>
            <h2 className="mt-4 text-lg font-semibold text-neutral-100">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-400">{details}</p>
          </>
        ) : (
          <>
            <h2 className="mt-4 text-lg font-semibold text-neutral-100">Are you sure?</h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-400">
              Are you sure you want to clear this data? It cannot be recovered.
            </p>
          </>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            disabled={busy}
            className="rounded-full px-4 py-2 text-sm text-neutral-300 transition hover:bg-white/10 hover:text-white"
          >
            Cancel
          </button>
          {step === 'explain' ? (
            <button
              type="button"
              onClick={() => setStep('sure')}
              className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-neutral-100 transition hover:bg-white/15"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={confirm}
              disabled={busy}
              className="rounded-full bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-400 disabled:opacity-60"
            >
              {busy ? 'Deleting…' : confirmLabel}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
