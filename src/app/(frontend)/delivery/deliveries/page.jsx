import { DashboardShell } from '@/components/dashboard-shell'
import { DeliveryWorkPanel } from '@/components/delivery-work-panel'
import { WorkSection } from '@/components/dashboard-ui'
import { requireApprovedDelivery } from '@/server/guards'
import { listCourierWork } from '@/server/delivery'

export default async function DeliveryAssignmentsPage() {
  const user = await requireApprovedDelivery()
  const work = await listCourierWork(user)
  const available = work.filter((item) => item.status === 'open' && item.canAccept)
  const active = work.filter((item) => item.isMine && !['delivered', 'cancelled'].includes(item.status))

  return (
    <DashboardShell
      user={user}
      title="Active deliveries"
      subtitle="Jobs you can accept, and deliveries you are already carrying."
    >
      <div className="space-y-8">
        <WorkSection
          title="Available to accept"
          description="You can take these jobs. The full address appears after you accept."
          count={available.length}
          empty={<p className="text-sm text-[#5c6f62]">No open delivery jobs right now.</p>}
        >
          <DeliveryWorkPanel bare work={available} userId={user.id} emptyMessage="No open delivery jobs right now." />
        </WorkSection>
        <WorkSection
          title="Active deliveries"
          description="Update pickup, transit, and delivery from here."
          count={active.length}
          href="/delivery/history"
          linkLabel="View delivered"
          empty={<p className="text-sm text-[#5c6f62]">Nothing is in progress.</p>}
        >
          <DeliveryWorkPanel bare work={active} userId={user.id} emptyMessage="Nothing is in progress." />
        </WorkSection>
      </div>
    </DashboardShell>
  )
}
