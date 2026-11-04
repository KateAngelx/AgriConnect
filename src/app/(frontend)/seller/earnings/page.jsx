import { DashboardShell, peso } from '@/components/dashboard-shell'
import { PeriodFilter } from '@/components/period-filter'
import { ActivityBars, MetricTile } from '@/components/dashboard-overview-ui'
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
      <div className="mb-4">
        <PeriodFilter period={period} pathname="/seller/earnings" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricTile section="Completed" label="Completed sales" value={peso(finances.gross)} hint={`${finances.completedOrders} orders`} icon="coin" tone="green" />
        <MetricTile section="Completed" label="Completed orders" value={finances.completedOrders} icon="package" tone="teal" />
        <MetricTile section="Open" label="Open order value" value={peso(finances.pending)} hint="Not completed yet" icon="wallet" tone="amber" />
        <MetricTile section="Open" label="Open orders" value={finances.openOrders} icon="clipboard" tone="blue" />
      </div>
      <div className="mt-4">
        <ActivityBars title="Sales this week" series={finances.series} caption="Your line-item sales for the last 7 days." />
      </div>
    </DashboardShell>
  )
}
