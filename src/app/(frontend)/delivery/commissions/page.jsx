import { DashboardShell, peso, pretty } from '@/components/dashboard-shell'
import { PeriodFilter } from '@/components/period-filter'
import { ListRow, StatCard, StatusBadge, WorkSection } from '@/components/dashboard-ui'
import { inPeriod, periodLabel, readPeriod } from '@/lib/report-period'
import { requireApprovedDelivery } from '@/server/guards'
import { listCommissions } from '@/server/delivery'

export default async function CommissionsPage({ searchParams }) {
  const user = await requireApprovedDelivery()
  const query = await searchParams
  const period = readPeriod(query.period)
  const commissions = await listCommissions(user)
  const waiting = commissions.filter((item) => item.commissionStatus !== 'paid')
  const paid = commissions.filter((item) => item.commissionStatus === 'paid' && inPeriod(item.updatedAt, period))
  const waitingTotal = waiting.reduce((sum, item) => sum + item.commission, 0)
  const paidTotal = paid.reduce((sum, item) => sum + item.commission, 0)

  return (
    <DashboardShell user={user} title="Commissions" subtitle={`${periodLabel(period)} · unpaid commissions, and payouts already marked paid.`}>
      <div className="mb-6">
        <PeriodFilter period={period} pathname="/delivery/commissions" />
      </div>
      <section className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Waiting for payout" value={peso(waitingTotal)} hint={`${waiting.length} delivered`} />
        <StatCard label="Paid out" value={peso(paidTotal)} hint={`${paid.length} delivered`} />
      </section>

      <div className="mt-8 space-y-8">
        <WorkSection
          title="Waiting for payout"
          description="Every delivered job that is not marked paid yet."
          count={waiting.length}
          empty={<p className="text-sm text-[#5c6f62]">No commission is waiting.</p>}
        >
          <CommissionList rows={waiting} />
        </WorkSection>
        <WorkSection
          title="Paid out"
          description={`${periodLabel(period)} · commissions an administrator has already marked paid.`}
          count={paid.length}
          empty={<p className="text-sm text-[#5c6f62]">No paid commission yet.</p>}
        >
          <CommissionList rows={paid} />
        </WorkSection>
      </div>
    </DashboardShell>
  )
}

function CommissionList({ rows }) {
  return (
    <ul className="space-y-3">
      {rows.map((item) => (
        <ListRow
          key={item.id}
          title={item.order?.reference || 'Delivery'}
          badge={<StatusBadge status={pretty(item.commissionStatus)} />}
          amount={peso(item.commission)}
        />
      ))}
    </ul>
  )
}
