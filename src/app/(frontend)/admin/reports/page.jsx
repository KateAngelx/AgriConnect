import Link from 'next/link'
import { DashboardShell, peso } from '@/components/dashboard-shell'
import { PeriodFilter } from '@/components/period-filter'
import { DashboardPanel, StatCard } from '@/components/dashboard-ui'
import { periodLabel, readPeriod } from '@/lib/report-period'
import { platformReport } from '@/server/admin'
import { requireAdmin } from '@/server/guards'

export default async function AdminReportsPage({ searchParams }) {
  const user = await requireAdmin()
  const query = await searchParams
  const period = readPeriod(query.period)
  const report = await platformReport(period)

  return (
    <DashboardShell user={user} title="Reports" subtitle={`${periodLabel(period)} · orders, payments, and applications in this range.`}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <PeriodFilter period={period} pathname="/admin/reports" />
        <Link href={`/api/admin/reports/export?period=${period}`} className="btn btn-secondary">
          Export CSV
        </Link>
      </div>
      <div className="space-y-8">
        <section className="space-y-3">
          <h2 className="text-[13px] font-semibold text-[#2e7d32]">Orders</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard label="Orders" value={report.orders} hint={`${report.ordersAttention} still active`} />
            <StatCard label="Order total" value={peso(report.orderVolume)} hint="Subtotal plus delivery fees" />
          </div>
        </section>
        <section className="space-y-3">
          <h2 className="text-[13px] font-semibold text-[#2e7d32]">Payments</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard label="Paid transactions" value={report.paidTransactions} hint={peso(report.paidVolume)} />
            <StatCard label="Pending payments" value={report.payments} />
          </div>
        </section>
        <section className="space-y-3">
          <h2 className="text-[13px] font-semibold text-[#2e7d32]">Approving</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="New accounts" value={report.users} hint={`${report.buyers} buyers`} />
            <StatCard label="Approved sellers" value={report.approvedSellers} />
            <StatCard label="Delivery partners" value={report.approvedDelivery} />
            <StatCard label="Applications" value={report.applicationsTotal} hint={`${report.applicationsApproved} approved · ${report.pending} waiting`} />
          </div>
        </section>
      </div>
      <div className="mt-6">
        <DashboardPanel title="Marketplace volume" description="These totals follow the period above. Sellers still fulfill their own orders.">
          <p className="text-sm text-[#5c6f62]">
            {report.orders} orders · {peso(report.orderVolume)} in order value · {report.ordersAttention} still active · {report.activeProducts} listings are live on the marketplace.
          </p>
        </DashboardPanel>
      </div>
    </DashboardShell>
  )
}
