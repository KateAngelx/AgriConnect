import { DashboardShell, peso } from '@/components/dashboard-shell'
import { DashboardPanel, ListRow, StatusBadge } from '@/components/dashboard-ui'
import { requireApprovedDelivery } from '@/server/guards'
import { listCommissions } from '@/server/delivery'

export default async function DeliveryHistoryPage() {
  const user = await requireApprovedDelivery()
  const history = await listCommissions(user)

  return (
    <DashboardShell user={user} title="Delivery history" subtitle="Completed deliveries and commission status.">
      {history.length ? (
        <ul className="space-y-3">
          {history.map((item) => (
            <ListRow
              key={item.id}
              badge={<StatusBadge status={item.commissionStatus} />}
              title={item.order?.reference || 'Delivery'}
              meta={`${item.status.replaceAll('-', ' ')} · ${peso(item.commission)} commission`}
            />
          ))}
        </ul>
      ) : (
        <DashboardPanel title="No completed deliveries yet">
          <p className="text-sm text-[#65766d]">Finished jobs will appear here with commission details.</p>
        </DashboardPanel>
      )}
    </DashboardShell>
  )
}
