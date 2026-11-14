import { CalendarDays } from 'lucide-react'
import { EmptyState, PageLayout } from './Page'

// Reading stats over time. For now a placeholder: the reading calendar comes later.
export default function StatsPage(): React.JSX.Element {
  return (
    <PageLayout title="Reading stats" subtitle="Your reading over time">
      <EmptyState icon={CalendarDays} title="Your reading calendar is on its way">
        Every reading session is already being saved, so when it arrives it will show your history
        right back to your first page.
      </EmptyState>
    </PageLayout>
  )
}
