import { ChartColumn, Database, Library, Settings, type LucideIcon } from 'lucide-react'

// The pages in the sidebar, in order. ⌘1 opens the first, ⌘2 the second, and so on.
// To add a page: add it here, then show it in Home.tsx.

export type PageId = 'library' | 'stats' | 'settings' | 'data'

export type PageInfo = {
  id: PageId
  label: string
  icon: LucideIcon
}

export const PAGES: PageInfo[] = [
  { id: 'library', label: 'Library', icon: Library },
  { id: 'stats', label: 'Reading stats', icon: ChartColumn },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'data', label: 'Data', icon: Database }
]
