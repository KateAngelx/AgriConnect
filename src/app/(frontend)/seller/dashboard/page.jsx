import { Suspense } from 'react'
import { DashboardShell, peso, pretty } from '@/components/dashboard-shell'
import { MetricBoard, MetricTile, NotificationFeed, QuickActions } from '@/components/dashboard-overview-ui'
import { StatusBadge, WorkSection, workGridClass } from '@/components/dashboard-ui'
import { PagedRows } from '@/components/paged-rows'
import { groupBySection, sellerOrderSection } from '@/lib/work-sections'
import { requireSeller } from '@/server/guards'
import { listNotifications } from '@/server/notifications'
import { listOwnedOrders, sellerSnapshot } from '@/server/seller'
import { commissionRate } from '@/server/payments'
import { AlertBanner } from '@/components/dashboard-ui'
import { DashboardIcon } from '@/components/dashboard-icons'

export default async function SellerDashboardPage() {
  const user = await requireSeller()

  return (
    <DashboardShell
      user={user}
      title="Overview"
      subtitle="Orders that need you, deliveries in progress, and shop totals."
      variant="overview"
    >
      <Suspense fallback={<MetricsLoading />}>
        <SellerMetrics user={user} />
      </Suspense>
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          <Suspense fallback={<OrdersLoading />}>
            <SellerOrderSections user={user} />
          </Suspense>
        </div>
        <aside className="space-y-4">
          <Suspense fallback={<NotificationsLoading />}>
            <SellerNotifications user={user} />
          </Suspense>
          <QuickActions
            columns={1}
            actions={[
              { section: 'Shop', label: 'Add product', href: '/seller/products?new=1', icon: 'plus' },
              { section: 'Shop', label: 'Inventory', href: '/seller/inventory', icon: 'boxes' },
              { section: 'Shop', label: 'Product reviews', href: '/seller/reviews', icon: 'clipboard' },
              { section: 'Orders', label: 'Orders', href: '/seller/orders', icon: 'clipboard' },
              { section: 'Account', label: 'Feedback', href: '/seller/feedback', icon: 'clipboard' },
              { section: 'Account', label: 'Report an issue', href: '/seller/issues', icon: 'clipboard' },
              { section: 'Account', label: 'My shop', href: '/seller/shop', icon: 'user' },
            ]}
          />
        </aside>
      </div>
    </DashboardShell>
  )
}

async function SellerMetrics({ user }) {
  const [summary, currentCommissionRate] = await Promise.all([sellerSnapshot(user), commissionRate()])

  return (
    <>
      <div className="mb-4">
        <AlertBanner tone="info">
          Platform commission: ₱{currentCommissionRate} per item is charged for eligible delivered orders. This commission is
          deducted from payouts and is not added to the buyer&apos;s checkout price.
        </AlertBanner>
      </div>
      <MetricBoard>
        <MetricTile section="Shop" label="Total products" value={summary.products} icon="package" tone="teal" />
        <MetricTile section="Shop" label="Active products" value={summary.activeProducts} icon="store" tone="green" />
        <MetricTile section="Orders" label="Pending orders" value={summary.pendingOrders} icon="clipboard" tone="amber" />
        <MetricTile section="Orders" label="Completed orders" value={summary.completedOrders} icon="package" tone="blue" />
        <MetricTile section="Sales" label="Total sales" value={peso(summary.totalSales)} hint="Completed product sales" icon="coin" tone="green" />
        <MetricTile section="Sales" label="Earnings" value={peso(summary.earnings)} hint="After platform commission" icon="wallet" tone="teal" />
        <MetricTile section="Inventory" label="Low stock" value={summary.lowStock} hint={`${summary.activeProducts} active listings`} icon="boxes" tone="amber" />
      </MetricBoard>
    </>
  )
}

async function SellerOrderSections({ user }) {
  const orders = await listOwnedOrders(user, { limit: 30 })
  const grouped = groupBySection(orders, sellerOrderSection)

  return (
    <div className={workGridClass}>
      <WorkSection
        title="Needs your action"
        description="Recent orders that need confirmation, preparation, or handoff."
        count={(grouped['needs-you'] || []).length}
        href="/seller/orders"
        linkLabel="Open orders"
        empty={<p className="text-sm text-[#5c6f62]">No orders are waiting on you.</p>}
      >
        <OrderPreview rows={grouped['needs-you'] || []} />
      </WorkSection>
      <WorkSection
        title="Active orders"
        description="Recent orders already moving through fulfillment."
        count={(grouped.active || []).length}
        href="/seller/orders"
        linkLabel="Open orders"
        empty={<p className="text-sm text-[#5c6f62]">No orders are in progress with a courier.</p>}
      >
        <OrderPreview rows={grouped.active || []} />
      </WorkSection>
      <WorkSection
        title="Completed"
        description="Recently completed orders."
        count={(grouped.completed || []).length}
        href="/seller/earnings"
        linkLabel="View earnings"
        empty={<p className="text-sm text-[#5c6f62]">Completed orders will show up here.</p>}
      >
        <OrderPreview rows={grouped.completed || []} />
      </WorkSection>
    </div>
  )
}

async function SellerNotifications({ user }) {
  const notes = await listNotifications(user.id)
  return <NotificationFeed notes={notes} />
}

function MetricsLoading() {
  return <LoadingPanel label="Loading shop and sales summary…" />
}

function OrdersLoading() {
  return <LoadingPanel label="Loading your recent orders…" />
}

function NotificationsLoading() {
  return <LoadingPanel label="Loading notifications…" />
}

function LoadingPanel({ label }) {
  return (
    <div role="status" className="ui-card mb-4 flex min-h-20 items-center gap-3 p-5 text-sm text-[#5c6f62]">
      <span className="size-4 animate-spin rounded-full border-2 border-[#b8d2af] border-t-[#2e7d32]" />
      {label}
    </div>
  )
}

function OrderPreview({ rows }) {
  return (
    <PagedRows>
      {rows.map((order) => (
        <li key={order.id} className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="font-semibold text-[#142016]">{order.reference}</p>
            <p className="text-[13px] text-[#5c6f62]">
              {order.buyerName} · {order.fulfillment} · {peso(order.subtotal)} product sales
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <StatusBadge status={pretty(order.status)} />
            <a href={`/seller/orders?order=${encodeURIComponent(order.id)}`} className="grid size-9 place-items-center rounded-lg border border-[#d5e4d4] text-[#2e7d32] hover:bg-[#eef8e8]" aria-label={`View details for ${order.reference}`} title="View details">
              <DashboardIcon name="eye" className="size-4" />
            </a>
          </div>
        </li>
      ))}
    </PagedRows>
  )
}
