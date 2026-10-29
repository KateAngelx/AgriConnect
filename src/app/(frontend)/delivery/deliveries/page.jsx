import { DashboardShell } from '@/components/dashboard-shell'
import { DashboardPanel, StatusBadge } from '@/components/dashboard-ui'
import { DeliveryWorkPanel } from '@/components/delivery-work-panel'
import { requireApprovedDelivery } from '@/server/guards'
import { listCourierWork } from '@/server/delivery'

export default async function DeliveryAssignmentsPage() {
  const user = await requireApprovedDelivery()
  const work = await listCourierWork(user)
  const active = work.filter((item) => item.isMine && !['delivered', 'cancelled'].includes(item.status))
  const open = work.filter((item) => item.status === 'open' && item.canAccept)

  return (
    <DashboardShell user={user} title="My deliveries" subtitle="Open assignments and jobs you are handling.">
      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardPanel title="Available assignments" description={`${open.length} open`}>
          {open.length ? (
            <DeliveryWorkPanel work={open.slice(0, 5)} userId={user.id} />
          ) : (
            <p className="text-sm text-[#65766d]">No open delivery jobs right now.</p>
          )}
        </DashboardPanel>
        <DashboardPanel title="Active deliveries" description={`${active.length} in progress`}>
          {active.length ? (
            <ul className="space-y-3 text-sm">
              {active.map((item) => (
                <li key={item.id} className="flex items-center justify-between rounded-lg bg-[#f7f7f2] px-3 py-2">
                  <span>{item.reference || item.orderId}</span>
                  <StatusBadge status={item.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[#65766d]">Accept an assignment from the overview dashboard.</p>
          )}
        </DashboardPanel>
      </div>
    </DashboardShell>
  )
}
