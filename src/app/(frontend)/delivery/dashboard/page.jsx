import { DashboardShell, peso } from '@/components/dashboard-shell'
import { DeliveryWorkPanel } from '@/components/delivery-work-panel'
import { MetricBoard, MetricTile, NotificationFeed, QuickActions } from '@/components/dashboard-overview-ui'
import { AlertBanner, WorkSection, workGridClass } from '@/components/dashboard-ui'
import { requireDelivery } from '@/server/guards'
import { deliverySnapshot, listCourierWork } from '@/server/delivery'
import { listNotifications } from '@/server/notifications'

export default async function DeliveryDashboardPage({ searchParams }) {
  const user = await requireDelivery()
  const query = await searchParams
  const error = typeof query.error === 'string' ? query.error : ''
  const success = typeof query.success === 'string' ? query.success : ''
  const [summary, work, notes] = await Promise.all([
    deliverySnapshot(user),
    listCourierWork(user),
    listNotifications(user.id),
  ])
  const available = work.filter((item) => item.status === 'open' && item.canAccept)
  const active = work.filter((item) => item.isMine && !['delivered', 'cancelled'].includes(item.status))

  return (
    <DashboardShell
      user={user}
      title="Overview"
      subtitle="Jobs you can accept, deliveries in progress, and unpaid commission."
      variant="overview"
    >
      {error ? <div className="mb-6"><AlertBanner tone="error">{error}</AlertBanner></div> : null}
      {success ? <div className="mb-6"><AlertBanner tone="success">{success}</AlertBanner></div> : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-4">
          <MetricBoard>
            <MetricTile section="Deliveries" label="Available to accept" value={available.length} icon="truck" tone="amber" />
            <MetricTile section="Deliveries" label="Active deliveries" value={summary.active} icon="clipboard" tone="blue" />
            <MetricTile section="Payments" label="Unpaid commission" value={peso(summary.commission)} hint="Delivered, not yet paid" icon="coin" tone="green" />
          </MetricBoard>

          <div className={workGridClass}>
          <WorkSection
            title="Available to accept"
            description="Open jobs in your service area. Details stay limited until you accept."
            count={available.length}
            href="/delivery/deliveries"
            linkLabel="Open deliveries"
            empty={<p className="text-sm text-[#5c6f62]">No open jobs right now.</p>}
          >
            <DeliveryWorkPanel bare work={available} emptyMessage="No open jobs right now." />
          </WorkSection>

          <WorkSection
            title="Active deliveries"
            description="Jobs you accepted and have not delivered yet."
            count={active.length}
            href="/delivery/deliveries"
            linkLabel="Open deliveries"
            empty={<p className="text-sm text-[#5c6f62]">You have no delivery in progress.</p>}
          >
            <DeliveryWorkPanel bare work={active} emptyMessage="You have no delivery in progress." />
          </WorkSection>
          </div>

        </div>

        <aside className="space-y-4">
          <NotificationFeed notes={notes} />
          <QuickActions
            columns={1}
            actions={[
              { section: 'Deliveries', label: 'Active deliveries', href: '/delivery/deliveries', icon: 'truck' },
              { section: 'Deliveries', label: 'Delivered', href: '/delivery/history', icon: 'clipboard' },
              { section: 'Payments', label: 'Commissions', href: '/delivery/commissions', icon: 'coin' },
              { section: 'Account', label: 'Settings', href: '/delivery/settings', icon: 'user' },
            ]}
          />
        </aside>
      </div>
    </DashboardShell>
  )
}
