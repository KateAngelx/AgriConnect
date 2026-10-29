import { DashboardShell, peso } from '@/components/dashboard-shell'
import { DashboardPanel, StatCard } from '@/components/dashboard-ui'
import { platformReport } from '@/server/admin'
import { requireAdmin } from '@/server/guards'
import Link from 'next/link'

export default async function AdminReportsPage() {
  const user = await requireAdmin()
  const report = await platformReport()

  return (
    <DashboardShell user={user} title="Platform reports" subtitle="Registration and marketplace activity from live database records.">
      <div className="mb-4 flex justify-end">
        <Link href="/api/admin/reports/export" className="rounded-full border border-[#173c2c]/15 bg-white px-4 py-2 text-xs font-bold">
          Export CSV
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Registered accounts" value={report.users} />
        <StatCard label="Buyers" value={report.buyers} />
        <StatCard label="Approved sellers" value={report.approvedSellers} />
        <StatCard label="Delivery partners" value={report.approvedDelivery} />
        <StatCard label="Applications (total)" value={report.applicationsTotal} />
        <StatCard label="Applications approved" value={report.applicationsApproved} />
        <StatCard label="Applications rejected" value={report.applicationsRejected} />
        <StatCard label="Open applications" value={report.pending} />
        <StatCard label="Active products" value={report.activeProducts} />
        <StatCard label="Total orders" value={report.orders} />
        <StatCard label="Paid transactions" value={report.paidTransactions} />
        <StatCard label="Pending payments" value={report.payments} />
      </div>
      <div className="mt-6">
        <DashboardPanel title="Marketplace volume" description="Order totals are platform-wide counts, not seller shop management.">
          <p className="text-sm text-[#647066]">
            {report.orders} orders recorded · {report.ordersAttention} currently in progress · {peso(0)} reserved
            for seller earnings reporting on each seller dashboard.
          </p>
        </DashboardPanel>
      </div>
    </DashboardShell>
  )
}
