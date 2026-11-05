import { DashboardShell } from '@/components/dashboard-shell'
import { DeliveryAssignmentDetail, DeliveryWorkPanel } from '@/components/delivery-work-panel'
import { WorkSection, workGridClass } from '@/components/dashboard-ui'
import { Modal } from '@/components/modal'
import { requireApprovedDelivery } from '@/server/guards'
import { listCourierWork } from '@/server/delivery'

export default async function DeliveryAssignmentsPage({ searchParams }) {
  const user = await requireApprovedDelivery()
  const query = await searchParams
  const work = await listCourierWork(user)
  const jobId = typeof query.job === 'string' ? query.job : ''
  const selected = work.find((item) => item.id === jobId) || null
  const available = work.filter((item) => item.status === 'open' && item.canAccept)
  const assigned = work.filter((item) => item.isMine && item.status === 'accepted')
  const active = work.filter((item) => item.isMine && ['picked-up', 'in-transit'].includes(item.status))

  return (
    <DashboardShell
      user={user}
      title="Delivery assignments"
      subtitle="Review available jobs, accepted assignments, and deliveries in progress."
    >
      <div className={workGridClass}>
        <WorkSection
          title="Available to accept"
          description="You can take these jobs. The full address appears after you accept."
          count={available.length}
          empty={<p className="text-sm text-[#5c6f62]">No open delivery jobs right now.</p>}
        >
          <DeliveryWorkPanel bare work={available} userId={user.id} emptyMessage="No open delivery jobs right now." />
        </WorkSection>
        <WorkSection
          title="Assigned"
          description="Assignments accepted and waiting for pickup."
          count={assigned.length}
          empty={<p className="text-sm text-[#5c6f62]">No assignments are waiting for pickup.</p>}
        >
          <DeliveryWorkPanel bare work={assigned} userId={user.id} emptyMessage="No assignments are waiting for pickup." />
        </WorkSection>
        <WorkSection
          title="Active deliveries"
          description="Update pickup, transit, and delivery progress."
          count={active.length}
          href="/delivery/history"
          linkLabel="View delivered"
          empty={<p className="text-sm text-[#5c6f62]">Nothing is in progress.</p>}
        >
          <DeliveryWorkPanel bare work={active} userId={user.id} emptyMessage="Nothing is in progress." />
        </WorkSection>
      </div>
      {jobId ? (
        <Modal
          title={selected?.reference || 'Delivery'}
          subtitle={selected ? (selected.privacy === 'preview' ? 'Limited details until you accept.' : 'Pickup, drop-off, and the next step.') : 'This job is not in your list.'}
          closeHref="/delivery/deliveries"
          size="xl"
        >
          {selected ? <DeliveryAssignmentDetail assignment={selected} /> : <p className="text-sm text-[#5c6f62]">This job is not in your list.</p>}
        </Modal>
      ) : null}
    </DashboardShell>
  )
}
