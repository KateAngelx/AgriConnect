import { DashboardShell, greetingName, peso, pretty } from '@/components/dashboard-shell'
import { DeliveryWorkPanel } from '@/components/delivery-work-panel'
import {
  DashboardHero,
  MetricTile,
  NotificationFeed,
  OverviewPanel,
  PromoBanner,
  QuickActions,
} from '@/components/dashboard-overview-ui'
import { AlertBanner, DataTable, StatusBadge } from '@/components/dashboard-ui'
import { ServiceAreaForm } from '@/components/profile-forms'
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
  const firstName = greetingName(user.name)
  const recent = work.slice(0, 5)

  return (
    <DashboardShell user={user} title="" subtitle="" variant="overview">
      {error ? <div className="mb-6"><AlertBanner tone="error">{error}</AlertBanner></div> : null}
      {success ? <div className="mb-6"><AlertBanner tone="success">{success}</AlertBanner></div> : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          <DashboardHero
            label="Delivery dashboard"
            title={`Good morning, ${firstName}!`}
            description="Accept delivery jobs, update tracking for buyers, and record cash collected when orders are fulfilled."
            actionHref="/delivery/commissions"
            actionLabel="View commissions"
            imageUrl="https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=800&q=80"
          />

          <section className="grid gap-4 sm:grid-cols-3">
            <MetricTile label="Open jobs" value={summary.open} icon="truck" tone="amber" />
            <MetricTile label="Your active runs" value={summary.active} icon="clipboard" tone="blue" />
            <MetricTile
              label="Unpaid commission"
              value={peso(summary.commission)}
              hint="After completed deliveries"
              icon="coin"
              tone="green"
            />
          </section>

          <OverviewPanel title="Recent assignments">
            {recent.length ? (
              <DataTable columns={['Order', 'Address', 'Commission', 'Status']}>
                {recent.map((delivery) => (
                  <tr key={delivery.id} className="hover:bg-[#fafbfa]">
                    <td className="px-5 py-3 font-medium text-[#142016]">
                      {delivery.order?.reference || delivery.orderId}
                    </td>
                    <td className="max-w-[200px] truncate px-5 py-3 text-sm text-[#65766d]">
                      {delivery.order?.deliveryAddress || '—'}
                    </td>
                    <td className="px-5 py-3 text-sm font-semibold">{peso(delivery.commission)}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={pretty(delivery.status)} />
                    </td>
                  </tr>
                ))}
              </DataTable>
            ) : (
              <p className="text-sm text-[#65766d]">No assignments in your area yet.</p>
            )}
          </OverviewPanel>

          <DeliveryWorkPanel work={work} userId={user.id} />

          <div className="grid gap-6 lg:grid-cols-2">
            <OverviewPanel title="Service area" description="Jobs are matched using your coverage area.">
              <ServiceAreaForm area={user.serviceArea} />
            </OverviewPanel>
            <QuickActions
              actions={[
                { label: 'Commissions', href: '/delivery/commissions', icon: 'coin' },
                { label: 'Marketplace', href: '/products', icon: 'store' },
                { label: 'Updates', href: '/notifications', icon: 'bell' },
                { label: 'Account help', href: '/contact', icon: 'clipboard' },
              ]}
            />
          </div>

          <PromoBanner
            title="Reliable last-mile delivery"
            body="Update tracking at each step so buyers and sellers stay informed until the order is complete."
            href="/delivery/commissions"
            actionLabel="Track earnings"
            imageUrl="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=900&q=80"
          />
        </div>

        <aside className="space-y-6">
          <NotificationFeed notes={notes.slice(0, 5)} />
        </aside>
      </div>
    </DashboardShell>
  )
}
