import { Settings2 } from 'lucide-react'
import { EmptyState, PageLayout } from './Page'

// App settings. For now a placeholder.
export default function SettingsPage(): React.JSX.Element {
  return (
    <PageLayout title="Settings">
      <EmptyState icon={Settings2} title="Nothing to set up yet">
        Options like keyboard shortcuts and voice commands will live here.
      </EmptyState>
    </PageLayout>
  )
}
