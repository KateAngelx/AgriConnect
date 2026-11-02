import { DashboardShell, peso } from '@/components/dashboard-shell'
import { PeriodFilter } from '@/components/period-filter'
import { StatCard } from '@/components/dashboard-ui'
import { periodLabel, readPeriod } from '@/lib/report-period'
import { requireApprovedSeller } from '@/server/guards'
import { sellerFinancials } from '@/server/seller'

export default async function SellerEarningsPage({ searchParams }) {
  const user = await requireApprovedSeller()
  const query = await searchParams
  const period = readPeriod(query.period)
  const finances = await sellerFinancials(user, period)

  return (
    <DashboardShell user={user} title="Earnings" subtitle={`${periodLabel(period)} · completed sales and orders still open.`}>
      <div className="mb-6">
        <PeriodFilter period={period} pathname="/seller/earnings" />
      </div>
      <div className="space-y-8">
        <section className="space-y-3">
          <h2 className="text-[17px] font-semibold text-[#142016]">Completed</h2>
          <p className="text-[13px] text-[#5c6f62]">Picked up, delivered, or marked complete. Amounts are your line items only.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard label="Completed sales" value={peso(finances.gross)} />
            <StatCard label="Completed orders" value={finances.completedOrders} />
          </div>
        </section>
        <section className="space-y-3">
          <h2 className="text-[17px] font-semibold text-[#142016]">Still open</h2>
          <p className="text-[13px] text-[#5c6f62]">Orders that are not completed yet. Cash is recorded on the order when the rules allow it.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard label="Open order value" value={peso(finances.pending)} />
            <StatCard label="Open orders" value={finances.openOrders} />
          </div>
        </section>
      </div>
    </DashboardShell>
  )
}
