import { setStatusAction } from '@/app/(frontend)/admin/actions'
import { DashboardShell } from '@/components/dashboard-shell'
import { AlertBanner, StatusBadge } from '@/components/dashboard-ui'
import { PagedRows } from '@/components/paged-rows'
import { pretty } from '@/lib/dashboard-format'
import { listUsers } from '@/server/admin'
import { requireAdmin } from '@/server/guards'

const roleOptions = [
  ['all', 'All roles'],
  ['buyer', 'Buyer'],
  ['seller', 'Seller'],
  ['delivery', 'Delivery personnel'],
  ['admin', 'Administrator'],
]

const statusOptions = [
  ['all', 'All statuses'],
  ['approved', 'Active'],
  ['suspended', 'Deactivated'],
  ['pending', 'Pending'],
  ['rejected', 'Rejected'],
]

export default async function AdminUsersPage({ searchParams }) {
  const user = await requireAdmin()
  const query = await searchParams
  const error = typeof query.error === 'string' ? query.error : ''
  const success = typeof query.success === 'string' ? query.success : ''
  const search = typeof query.q === 'string' ? query.q.trim() : ''
  const role = roleOptions.some(([value]) => value === query.role) ? query.role : 'all'
  const status = statusOptions.some(([value]) => value === query.status) ? query.status : 'all'
  const allUsers = await listUsers()
  const normalizedSearch = search.toLocaleLowerCase()
  const users = allUsers.filter((entry) => {
    const matchesSearch = !normalizedSearch || [
      entry.name,
      entry.email,
      entry.id,
    ].some((value) => String(value || '').toLocaleLowerCase().includes(normalizedSearch))
    return matchesSearch &&
      (role === 'all' || entry.role === role) &&
      (status === 'all' || entry.status === status)
  })

  return (
    <DashboardShell user={user} title="User management" subtitle="Search accounts, review permitted activity, and manage account access.">
      {error ? <div className="mb-4"><AlertBanner tone="error">{error}</AlertBanner></div> : null}
      {success ? <div className="mb-4"><AlertBanner tone="success">{success}</AlertBanner></div> : null}

      <form method="get" className="ui-card mb-4 grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_12rem_12rem_auto] sm:items-end">
        <label className="grid gap-1 text-sm font-medium text-brand-900">
          Search accounts
          <input
            type="search"
            name="q"
            defaultValue={search}
            placeholder="Name, email, or account ID"
            className="min-h-11 rounded-xl border border-brand-line bg-white px-3"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-brand-900">
          Role
          <select name="role" defaultValue={role} className="min-h-11 rounded-xl border border-brand-line bg-white px-3">
            {roleOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-brand-900">
          Account status
          <select name="status" defaultValue={status} className="min-h-11 rounded-xl border border-brand-line bg-white px-3">
            {statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <button type="submit" className="btn btn-primary">Filter accounts</button>
      </form>

      <section className="ui-card overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-brand-line px-4 py-3 sm:px-5">
          <div>
            <h2 className="text-lg font-semibold text-brand-900">Accounts</h2>
            <p className="text-sm text-brand-muted">{users.length} of {allUsers.length} accounts</p>
          </div>
          {search || role !== 'all' || status !== 'all' ? (
            <a href="/admin/users" className="text-sm font-semibold text-brand-700">Clear filters</a>
          ) : null}
        </div>
        {users.length ? (
          <PagedRows className="divide-y divide-brand-line">
            {users.map((entry) => (
              <li key={entry.id} className="px-4 py-4 sm:px-5">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-start">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-brand-900">{entry.name}</h3>
                    <p className="mt-0.5 break-all text-sm text-brand-muted">{entry.email || `Account ${entry.id}`}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-brand-muted">
                      <span>{pretty(entry.role)}</span>
                      <span aria-hidden="true">·</span>
                      <span>Registered {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString('en-PH') : 'Date unavailable'}</span>
                    </div>
                  </div>
                  <StatusBadge status={entry.status === 'approved' ? 'Active' : pretty(entry.status)} />
                  <div className="flex flex-wrap gap-2">
                    {entry.role === 'admin' ? (
                      <span className="px-2 py-2 text-sm text-brand-muted">Administrator access protected</span>
                    ) : entry.status === 'approved' ? (
                      <StatusButton userId={entry.id} status="suspended" label="Deactivate account" danger />
                    ) : entry.status === 'suspended' ? (
                      <StatusButton userId={entry.id} status="approved" label="Activate account" />
                    ) : null}
                  </div>
                </div>
                <details className="mt-3">
                  <summary className="w-fit cursor-pointer text-sm font-semibold text-brand-700">View account details and activity</summary>
                  <div className="mt-3 grid gap-3 rounded-xl bg-[#f7fbf4] p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <Detail label="Account ID" value={entry.id} />
                    <Detail label="Roles" value={entry.roles.map(pretty).join(', ')} />
                    <Detail label="Profile" value={entry.seller?.farmName || entry.serviceArea || 'No additional profile'} />
                    <Detail label="Orders as buyer" value={entry.activity.orders} />
                    {entry.roles.includes('seller') ? <Detail label="Seller products" value={entry.activity.products} /> : null}
                    {entry.roles.includes('delivery') ? <Detail label="Assigned deliveries" value={entry.activity.deliveries} /> : null}
                  </div>
                </details>
              </li>
            ))}
          </PagedRows>
        ) : (
          <p className="p-6 text-sm text-brand-muted">No accounts match these filters.</p>
        )}
      </section>
    </DashboardShell>
  )
}

function Detail({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">{label}</p>
      <p className="mt-1 break-words font-medium text-brand-900">{value}</p>
    </div>
  )
}

function StatusButton({ userId, status, label, danger }) {
  return (
    <form action={setStatusAction}>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="status" value={status} />
      <button type="submit" className={danger ? 'btn btn-danger' : 'btn btn-dark'}>
        {label}
      </button>
    </form>
  )
}
