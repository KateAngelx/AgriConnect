import { setStatusAction } from '@/app/(frontend)/admin/actions'
import { DashboardShell, pretty } from '@/components/dashboard-shell'
import { AlertBanner, DataTable, StatusBadge, WorkSection, workGridClass } from '@/components/dashboard-ui'
import { listUsers } from '@/server/admin'
import { requireAdmin } from '@/server/guards'

const roleGroups = [
  ['seller', 'Sellers', 'Farm accounts that fulfill their own orders.'],
  ['delivery', 'Delivery partners', 'Couriers who can accept delivery jobs.'],
  ['buyer', 'Buyers', 'Shopping accounts.'],
  ['admin', 'Administrators', 'Accounts that review the marketplace.'],
]

export default async function AdminUsersPage({ searchParams }) {
  const user = await requireAdmin()
  const query = await searchParams
  const error = typeof query.error === 'string' ? query.error : ''
  const users = await listUsers()

  return (
    <DashboardShell user={user} title="Accounts" subtitle="Accounts grouped by role.">
      {error ? (
        <div className="mb-4">
          <AlertBanner tone="error">{error}</AlertBanner>
        </div>
      ) : null}

      <div className={workGridClass}>
        {roleGroups.map(([role, title, description]) => {
          const rows = users.filter((entry) => entry.role === role)
          return (
            <WorkSection key={role} title={title} description={description} count={rows.length} empty={<p className="text-sm text-[#5c6f62]">No {title.toLowerCase()} yet.</p>}>
              <DataTable embedded columns={['Account', 'Status', 'Profile', 'Actions']}>
                {rows.map((entry) => (
                  <tr key={entry.id} className="transition-colors hover:bg-black/[0.02]">
                    <td className="px-5 py-3">
                      <strong className="text-[#142016]">{entry.name}</strong>
                      <p className="mt-0.5 text-[#647066]">{entry.email}</p>
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={pretty(entry.status)} />
                    </td>
                    <td className="max-w-[200px] truncate px-5 py-3 text-[#647066]">
                      {entry.seller?.farmName || entry.serviceArea || '—'}
                    </td>
                    <td className="px-5 py-3">
                      {entry.role === 'admin' ? (
                        <span className="text-[#647066]">Protected</span>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {entry.status === 'approved' ? (
                            <StatusButton userId={entry.id} status="suspended" label="Suspend" danger />
                          ) : null}
                          {entry.status === 'suspended' ? (
                            <StatusButton userId={entry.id} status="approved" label="Reactivate" />
                          ) : null}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </DataTable>
            </WorkSection>
          )
        })}
      </div>
    </DashboardShell>
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
