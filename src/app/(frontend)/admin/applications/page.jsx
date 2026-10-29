import Link from 'next/link'
import { reviewApplicationAction } from '@/app/(frontend)/admin/actions'
import { AdminApplicationCard } from '@/components/admin-application-card'
import { DashboardShell } from '@/components/dashboard-shell'
import { AlertBanner, DashboardPanel, StatusBadge } from '@/components/dashboard-ui'
import { listRoleApplications } from '@/server/applications'
import { requireAdmin } from '@/server/guards'

const filters = [
  ['all', 'All'],
  ['pending', 'Pending'],
  ['under-review', 'Under review'],
  ['needs-info', 'Additional info'],
  ['approved', 'Approved'],
  ['rejected', 'Rejected'],
  ['seller', 'Seller'],
  ['delivery', 'Delivery'],
]

export default async function AdminApplicationsPage({ searchParams }) {
  const user = await requireAdmin()
  const query = await searchParams
  const error = typeof query.error === 'string' ? query.error : ''
  const success = typeof query.success === 'string' ? query.success : ''
  const filter = typeof query.filter === 'string' ? query.filter : 'pending'
  const applications = await listRoleApplications()
  const filtered = applications.filter((entry) => {
    if (filter === 'all') return true
    if (filter === 'seller' || filter === 'delivery') return entry.applicationType === filter
    return entry.status === filter
  })

  return (
    <DashboardShell
      user={user}
      title="Application management"
      subtitle="Review seller and delivery partner applications. Platform admins do not manage individual shop products or orders."
    >
      {error ? <div className="mb-4"><AlertBanner tone="error">{error}</AlertBanner></div> : null}
      {success ? <div className="mb-4"><AlertBanner tone="success">{success}</AlertBanner></div> : null}

      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map(([value, label]) => (
          <Link
            key={value}
            href={`/admin/applications?filter=${value}`}
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${
              filter === value ? 'bg-[#173c2c] text-white' : 'border border-[#173c2c]/15 bg-white text-[#142016]'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      <DashboardPanel title="Applications" description={`Showing ${filtered.length} record(s).`}>
        {filtered.length ? (
          <ul className="space-y-4">
            {filtered.map((entry) => (
              <AdminApplicationCard key={entry.id} entry={entry} reviewAction={reviewApplicationAction} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[#65766d]">No applications match this filter.</p>
        )}
      </DashboardPanel>

      <DashboardPanel title="Application history" description="Recently decided applications.">
        <ul className="divide-y divide-[#173c2c]/8 text-sm">
          {applications
            .filter((item) => ['approved', 'rejected'].includes(item.status))
            .slice(0, 8)
            .map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span>
                  {entry.user?.name} · {entry.applicationType}
                </span>
                <StatusBadge status={entry.status} />
              </li>
            ))}
        </ul>
      </DashboardPanel>
    </DashboardShell>
  )
}
