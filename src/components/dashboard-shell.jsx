import { PageHeading } from './page-heading'

export { peso, pretty, formatTimeAgo, greetingName } from '@/lib/dashboard-format'

export function DashboardShell({ title, subtitle = '', variant = 'default', children }) {
  return (
    <>
      <PageHeading title={title || 'Overview'} subtitle={subtitle} variant={variant} />
      {children}
    </>
  )
}
