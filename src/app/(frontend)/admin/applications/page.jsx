import Link from 'next/link'
import { reviewApplicationAction } from '@/app/(frontend)/admin/actions'
import { AdminApplicationCard } from '@/components/admin-application-card'
import { DashboardShell } from '@/components/dashboard-shell'
import { AlertBanner, WorkSection } from '@/components/dashboard-ui'
import { listRoleApplications } from '@/server/applications'
import { requireAdmin } from '@/server/guards'

const statusFilters = [
  ['queue', 'Waiting for approval'],
  ['pending', 'Pending'],
  ['under-review', 'Under review'],
  ['needs-info', 'Needs info'],
  ['approved', 'Approved'],
  ['rejected', 'Rejected'],
  ['all', 'All statuses'],
]

const roleFilters = [
  ['all', 'All roles'],
  ['seller', 'Sellers'],
  ['delivery', 'Delivery partners'],
]

const queueStatuses = new Set(['pending', 'under-review', 'needs-info'])

export default async function AdminApplicationsPage({ searchParams }) {
  const user = await requireAdmin()
  const query = await searchParams
  const error = typeof query.error === 'string' ? query.error : ''
  const success = typeof query.success === 'string' ? query.success : ''
  const raw = typeof query.filter === 'string' ? query.filter : 'queue'
  const roleQuery = typeof query.role === 'string' ? query.role : ''
  const role = roleQuery === 'seller' || roleQuery === 'delivery' || raw === 'seller' || raw === 'delivery'
    ? (roleQuery || raw)
    : 'all'
  const status = raw === 'seller' || raw === 'delivery' ? 'queue' : raw
  const applications = await listRoleApplications()
  const scoped = applications.filter((entry) => role === 'all' || entry.applicationType === role)
  const waiting = scoped.filter((entry) => queueStatuses.has(entry.status))
  const decided = scoped.filter((entry) => entry.status === 'approved' || entry.status === 'rejected')
  const shown = status === 'queue'
    ? waiting
    : status === 'all'
      ? scoped
      : scoped.filter((entry) => entry.status === status)

  function hrefFor(nextStatus, nextRole) {
    const params = new URLSearchParams()
    if (nextStatus && nextStatus !== 'queue') params.set('filter', nextStatus)
    if (nextRole && nextRole !== 'all') params.set('role', nextRole)
    const search = params.toString()
    return search ? `/admin/applications?${search}` : '/admin/applications'
  }

  return (
    <DashboardShell
      user={user}
      title="Approvals"
      subtitle="Seller and delivery applications waiting for a decision."
    >
      {error ? <div className="mb-4"><AlertBanner tone="error">{error}</AlertBanner></div> : null}
      {success ? <div className="mb-4"><AlertBanner tone="success">{success}</AlertBanner></div> : null}

      <div className="mb-6 space-y-3">
        <FilterRow label="Decision" options={statusFilters} current={status} hrefFor={(value) => hrefFor(value, role)} />
        <FilterRow label="Role" options={roleFilters} current={role} hrefFor={(value) => hrefFor(status, value)} />
      </div>

      <div className="space-y-8">
        {status === 'all' ? (
          <>
            <ApplicationSection
              title="Waiting for approval"
              description="Pending, under review, or waiting on more information."
              rows={waiting}
            />
            <ApplicationSection
              title="Already decided"
              description="Approved and rejected applications."
              rows={decided}
            />
          </>
        ) : (
          <ApplicationSection
            title={statusFilters.find(([value]) => value === status)?.[1] || 'Applications'}
            description={status === 'queue' ? 'These still need a decision.' : 'Applications that match this decision.'}
            rows={shown}
          />
        )}
      </div>
    </DashboardShell>
  )
}

function FilterRow({ label, options, current, hrefFor }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <p className="w-20 text-[13px] font-semibold text-[#5c6f62]">{label}</p>
      {options.map(([value, name]) => (
        <Link
          key={value}
          href={hrefFor(value)}
          className={`rounded-lg px-3 py-1.5 text-[13px] font-medium ${
            current === value ? 'bg-[#e3f3d8] text-[#1b5e20]' : 'text-[#142016] hover:bg-[#e3f3d8]'
          }`}
        >
          {name}
        </Link>
      ))}
    </div>
  )
}

function ApplicationSection({ title, description, rows }) {
  return (
    <WorkSection
      title={title}
      description={description}
      count={rows.length}
      empty={<p className="text-sm text-[#5c6f62]">Nothing in this section.</p>}
    >
      <ul className="space-y-4">
        {rows.map((entry) => (
          <AdminApplicationCard key={entry.id} entry={entry} reviewAction={reviewApplicationAction} />
        ))}
      </ul>
    </WorkSection>
  )
}
