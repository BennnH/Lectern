import { motion } from 'motion/react'
import { PAGES, type PageId } from '../lib/pages'

type Props = {
  page: PageId
  onNavigate: (page: PageId) => void
}

const isMac = window.api.platform === 'darwin'
const MODIFIER = isMac ? '⌘' : 'Ctrl+'

// The left-hand navigation shown everywhere except while reading
export default function Sidebar({ page, onNavigate }: Props): React.JSX.Element {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-white/5 bg-neutral-900/40 px-3 pt-14 pb-4">
      <p className="px-3 font-serif text-xl tracking-tight text-neutral-100">Lectern</p>

      <nav className="mt-6 space-y-0.5">
        {PAGES.map((item, index) => {
          const active = item.id === page
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              title={`${item.label} (${MODIFIER}${index + 1})`}
              aria-current={active ? 'page' : undefined}
              className={`relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                active ? 'text-white' : 'text-neutral-400 hover:bg-white/5 hover:text-neutral-200'
              }`}
            >
              {/* One highlight that slides between items */}
              {active && (
                <motion.span
                  layoutId="sidebar-highlight"
                  className="absolute inset-0 rounded-lg bg-white/10"
                  transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                />
              )}
              <Icon size={16} className="relative" />
              <span className="relative">{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Accounts don't exist yet: everything is saved locally for a guest */}
      <div className="mt-auto flex items-center gap-3 px-3 py-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-700 text-sm font-medium text-neutral-100 ring-1 ring-white/10">
          G
        </span>
        <span className="min-w-0">
          <span className="block text-sm text-neutral-200">Guest</span>
          <span className="block text-xs text-neutral-500">
            Saved on this {isMac ? 'Mac' : 'computer'}
          </span>
        </span>
      </div>
    </aside>
  )
}
