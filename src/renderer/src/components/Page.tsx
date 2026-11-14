import { motion } from 'motion/react'
import type { LucideIcon } from 'lucide-react'
import { EASE_OUT } from '../lib/motion'

// Building blocks shared by the sidebar pages, so they all look and move the same

type PageLayoutProps = {
  title: string
  subtitle?: string
  wide?: boolean // for pages with something big on them, like the reading calendar
  children: React.ReactNode
}

// A scrolling page with a big title, which fades in when you switch to it
export function PageLayout({
  title,
  subtitle,
  wide = false,
  children
}: PageLayoutProps): React.JSX.Element {
  return (
    <motion.div
      className="absolute inset-0 overflow-y-auto"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: EASE_OUT }}
    >
      <div className={`mx-auto px-10 pt-14 pb-16 ${wide ? 'max-w-5xl' : 'max-w-3xl'}`}>
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>}
        </header>
        {children}
      </div>
    </motion.div>
  )
}

type EmptyStateProps = {
  icon: LucideIcon
  title: string
  children: React.ReactNode
}

// A placeholder for a page with nothing on it yet
export function EmptyState({ icon: Icon, title, children }: EmptyStateProps): React.JSX.Element {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-white/10 px-8 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-neutral-400">
        <Icon size={20} />
      </span>
      <p className="mt-4 font-medium text-neutral-200">{title}</p>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-neutral-500">{children}</p>
    </div>
  )
}

// A big number with a small label under it
export function Stat({ value, label }: { value: string; label: string }): React.JSX.Element {
  return (
    <div>
      <p className="text-2xl font-semibold tracking-tight text-neutral-100 tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs text-neutral-500">{label}</p>
    </div>
  )
}

type SectionProps = {
  title: string
  description?: string
  danger?: boolean
  children: React.ReactNode
}

// A titled group of settings or actions
export function Section({ title, description, danger, children }: SectionProps): React.JSX.Element {
  return (
    <section className="mb-10">
      <h2
        className={`text-[11px] font-medium tracking-[0.16em] uppercase ${danger ? 'text-red-400/80' : 'text-neutral-500'}`}
      >
        {title}
      </h2>
      {description && <p className="mt-1 text-sm text-neutral-500">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}
