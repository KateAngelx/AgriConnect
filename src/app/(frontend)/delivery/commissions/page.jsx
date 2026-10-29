import { DashboardShell, peso, pretty } from '@/components/dashboard-shell'
import { DashboardPanel, EmptyState, ListRow, StatCard, StatusBadge } from '@/components/dashboard-ui'
import { requireApprovedDelivery } from '@/server/guards'
import { listCommissions } from '@/server/delivery'

export default async function CommissionsPage() {
  const user = await requireApprovedDelivery()
  const commissions = await listCommissions(user)
  const pending = commissions
    .filter((item) => item.commissionStatus !== 'paid')
    .reduce((sum, item) => sum + item.commission, 0)
  const paid = commissions
    .filter((item) => item.commissionStatus === 'paid')
    .reduce((sum, item) => sum + item.commission, 0)

  return (
    <DashboardShell user={user} title="Commissions" subtitle="Completed deliveries and payout status.">
      <section className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Waiting for payout" value={peso(pending)} />
        <StatCard label="Paid out" value={peso(paid)} />
      </section>

      <div className="mt-8">
        <DashboardPanel title="Delivery history">
          {commissions.length ? (
            <ul className="space-y-3">
              {commissions.map((item) => (
                <ListRow
                  key={item.id}
                  title={item.order?.reference || 'Delivery'}
                  badge={<StatusBadge status={pretty(item.commissionStatus)} />}
                  amount={peso(item.commission)}
                />
              ))}
            </ul>
          ) : (
            <EmptyState title="No commissions yet">
              Completed deliveries appear here. An administrator marks payouts as paid.
            </EmptyState>
          )}
        </DashboardPanel>
      </div>
    </DashboardShell>
  )
}
