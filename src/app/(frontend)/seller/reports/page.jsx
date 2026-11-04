import Link from 'next/link'
import { DashboardShell, peso, pretty } from '@/components/dashboard-shell'
import { PeriodFilter } from '@/components/period-filter'
import { StatusBadge, WorkSection, workGridClass } from '@/components/dashboard-ui'
import { PagedRows } from '@/components/paged-rows'
import { periodLabel, readPeriod } from '@/lib/report-period'
import { requireApprovedSeller } from '@/server/guards'
import { sellerSalesReport } from '@/server/seller'

const statusOrder = [
  'placed',
  'confirmed',
  'preparing',
  'ready-for-pickup',
  'delivery-assigned',
  'courier-picked-up',
  'out-for-delivery',
  'delivered',
  'picked-up',
  'completed',
  'cancelled',
]

export default async function SellerReportsPage({ searchParams }) {
  const user = await requireApprovedSeller()
  const query = await searchParams
  const period = readPeriod(query.period)
  const rows = await sellerSalesReport(user, period)
  const known = new Set(statusOrder)
  const extra = [...new Set(rows.map((row) => row.status).filter((status) => !known.has(status)))]
  const groups = [...statusOrder, ...extra]
    .map((status) => ({ status, rows: rows.filter((row) => row.status === status) }))
    .filter((group) => group.rows.length)

  return (
    <DashboardShell user={user} title="Sales reports" subtitle={`${periodLabel(period)} · orders that include your products, split by status.`}>
      <div className="mb-4">
        <PeriodFilter period={period} pathname="/seller/reports" />
      </div>
      {groups.length ? (
        <div className={workGridClass}>
          {groups.map((group) => (
            <WorkSection
              key={group.status}
              title={pretty(group.status)}
              description="Orders in this status."
              count={group.rows.length}
            >
              <PagedRows>
                {group.rows.map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <Link href={`/seller/orders?order=${encodeURIComponent(row.id)}`} className="font-semibold text-[#142016] hover:text-[#4f8d3b]">
                        {row.reference}
                      </Link>
                      <p className="text-[13px] text-[#5c6f62]">
                        {pretty(row.paymentStatus)} · {row.createdAt ? new Date(row.createdAt).toLocaleDateString('en-PH') : '—'}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <p className="text-sm font-semibold">{peso(row.total)}</p>
                      <StatusBadge status={pretty(row.status)} />
                    </div>
                  </li>
                ))}
              </PagedRows>
            </WorkSection>
          ))}
        </div>
      ) : (
        <WorkSection title="Recent sales" description="Orders that include your products in this range." count={0} empty={<p className="text-sm text-[#5c6f62]">Sales will appear when buyers order your products.</p>} />
      )}
    </DashboardShell>
  )
}
