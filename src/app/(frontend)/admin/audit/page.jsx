import { DashboardShell } from '@/components/dashboard-shell'
import { DashboardPanel, DataTable, StatusBadge } from '@/components/dashboard-ui'
import { listAuditEvents } from '@/server/admin'
import { requireAdmin } from '@/server/guards'
import Link from 'next/link'

export default async function AdminAuditPage({ searchParams }) {
  const user = await requireAdmin()
  const query = await searchParams
  const status = typeof query.status === 'string' ? query.status : 'all'
  const type = typeof query.type === 'string' ? query.type : 'all'
  const search = typeof query.search === 'string' ? query.search.trim().toLowerCase() : ''
  const allEvents = await listAuditEvents(100)
  const events = allEvents.filter((event) => {
    if (status !== 'all' && event.status !== status) return false
    if (type !== 'all' && !event.type.startsWith(type)) return false
    if (search && !`${event.applicant} ${event.type} ${event.note}`.toLowerCase().includes(search)) return false
    return true
  })

  return (
    <DashboardShell user={user} title="Audit log" subtitle="Recent application review decisions from stored records.">
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl border border-[#173c2c]/10 bg-white p-4">
        <form className="flex flex-wrap items-end gap-3" method="get">
          <label className="text-xs font-bold">Status
            <select name="status" defaultValue={status} className="mt-1 block rounded-xl border border-[#173c2c]/15 px-3 py-2 text-sm">
              <option value="all">All statuses</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="needs-info">Needs info</option><option value="under-review">Under review</option>
            </select>
          </label>
          <label className="text-xs font-bold">Type
            <select name="type" defaultValue={type} className="mt-1 block rounded-xl border border-[#173c2c]/15 px-3 py-2 text-sm">
              <option value="all">All types</option><option value="seller">Seller</option><option value="delivery">Delivery</option>
            </select>
          </label>
          <label className="text-xs font-bold">Search
            <input name="search" defaultValue={search} placeholder="Applicant or note" className="mt-1 block rounded-xl border border-[#173c2c]/15 px-3 py-2 text-sm" />
          </label>
          <button className="rounded-full bg-[#173c2c] px-4 py-2 text-xs font-bold text-white">Apply filters</button>
        </form>
        <Link href="/api/admin/audit/export" className="rounded-full border border-[#173c2c]/15 px-4 py-2 text-xs font-bold">Export CSV</Link>
      </div>
      <DashboardPanel title="Application decisions">
        {events.length ? (
          <DataTable columns={['Applicant', 'Type', 'Status', 'Note', 'Updated']}>
            {events.map((event) => (
              <tr key={event.id}>
                <td className="px-5 py-3 font-semibold">{event.applicant}</td>
                <td className="px-5 py-3 capitalize">{event.type}</td>
                <td className="px-5 py-3">
                  <StatusBadge status={event.status} />
                </td>
                <td className="max-w-xs truncate px-5 py-3 text-[#647066]">{event.note || '—'}</td>
                <td className="px-5 py-3 text-[#647066]">
                  {event.at ? new Date(event.at).toLocaleString('en-PH') : '—'}
                </td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <p className="text-sm text-[#65766d]">No review events recorded yet.</p>
        )}
      </DashboardPanel>
    </DashboardShell>
  )
}
