import Link from 'next/link'
import { DashboardShell, peso } from '@/components/dashboard-shell'
import { PeriodFilter } from '@/components/period-filter'
import { ActivityBars } from '@/components/dashboard-overview-ui'
import { DashboardPanel, StatCard } from '@/components/dashboard-ui'
import { periodLabel, readPeriod } from '@/lib/report-period'
import { adminVolumeActivity, platformReport } from '@/server/admin'
import { requireAdmin } from '@/server/guards'

export default async function AdminReportsPage({ searchParams }) {
  const user = await requireAdmin()
  const query = await searchParams
  const period = readPeriod(query.period)
  const [report, volume] = await Promise.all([platformReport(period), adminVolumeActivity()])

  return (
    <DashboardShell user={user} title="Reports" subtitle={`${periodLabel(period)} · marketplace totals. Each seller still fulfills their own orders.`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <PeriodFilter period={period} pathname="/admin/reports" />
        <Link href={`/api/admin/reports/export?period=${period}`} className="btn btn-secondary">
          Export CSV
        </Link>
      </div>
      <DashboardPanel fit title="This period" description="Combined totals for every seller. This is the marketplace view, not one farm's order list.">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon="clipboard" label="Orders" value={report.orders} hint={`${report.ordersAttention} still active`} />
          <StatCard icon="coin" label="Order total" value={peso(report.orderVolume)} hint="Subtotal plus delivery fees" />
          <StatCard icon="wallet" label="Paid transactions" value={report.paidTransactions} hint={peso(report.paidVolume)} />
          <StatCard icon="wallet" label="Pending payments" value={report.payments} />
          <StatCard icon="users" label="New accounts" value={report.users} hint={`${report.buyers} buyers`} />
          <StatCard icon="store" label="Approved sellers" value={report.approvedSellers} />
          <StatCard icon="truck" label="Delivery partners" value={report.approvedDelivery} />
          <StatCard icon="package" label="Applications" value={report.applicationsTotal} hint={`${report.applicationsApproved} approved · ${report.pending} waiting`} />
        </div>
        <p className="mt-4 text-sm text-[#5c6f62]">
          A ₱3 per kilo platform share on this period would be {peso(report.platformFee)}. Checkout does not add that fee yet, so sellers still receive their product price and couriers still receive the ₱49 delivery fee.
        </p>
      </DashboardPanel>
      <div className="mt-4">
        <ActivityBars title="Order value" series={volume} caption="Order total, including delivery fees, for each of the last 7 days." />
      </div>
    </DashboardShell>
  )
}
