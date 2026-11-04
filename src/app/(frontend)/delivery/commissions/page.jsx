import { DashboardShell, peso, pretty } from '@/components/dashboard-shell'
import { PeriodFilter } from '@/components/period-filter'
import { ActivityBars, MetricBoard, MetricTile } from '@/components/dashboard-overview-ui'
import { StatusBadge, WorkSection, workGridClass } from '@/components/dashboard-ui'
import { PagedRows } from '@/components/paged-rows'
import { lastDaySeries, localDayKey } from '@/lib/day-series'
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
  const series = lastDaySeries(commissions, (item) => ({
    key: localDayKey(item.updatedAt),
    value: item.commission,
  }))

  return (
    <DashboardShell user={user} title="Commissions" subtitle={`${periodLabel(period)} · each finished delivery pays ₱49.`}>
      <div className="mb-4">
        <PeriodFilter period={period} pathname="/delivery/commissions" />
      </div>
      <MetricBoard>
        <MetricTile section="Unpaid" label="Waiting for payout" value={peso(waitingTotal)} hint={`${waiting.length} deliveries`} icon="wallet" tone="amber" />
        <MetricTile section="Paid" label="Paid out" value={peso(paidTotal)} hint={periodLabel(period)} icon="coin" tone="green" />
      </MetricBoard>
      <div className="mt-4">
        <ActivityBars title="Commission this week" series={series} caption="₱49 for each delivery updated in the last 7 days." />
      </div>
      <div className={`mt-4 ${workGridClass}`}>
        <WorkSection
          title="Waiting for payout"
          description="Finished deliveries the admin has not marked paid."
          count={waiting.length}
          empty={<p className="text-sm text-[#5c6f62]">No commission is waiting.</p>}
        >
          <CommissionList rows={waiting} />
        </WorkSection>
        <WorkSection
          title="Paid out"
          description="Payouts already marked paid."
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
    <PagedRows>
      {rows.map((item) => (
        <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="font-semibold text-[#142016]">{item.order?.reference || 'Delivery'}</p>
            <p className="text-[13px] text-[#5c6f62]">{peso(item.commission)} fixed delivery fee</p>
          </div>
          <StatusBadge status={pretty(item.commissionStatus)} />
        </li>
      ))}
    </PagedRows>
  )
}
