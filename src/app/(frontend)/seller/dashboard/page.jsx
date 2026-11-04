import { DashboardShell, peso, pretty } from '@/components/dashboard-shell'
import { MetricBoard, MetricTile, NotificationFeed, QuickActions } from '@/components/dashboard-overview-ui'
import { StatusBadge, WorkSection, workGridClass } from '@/components/dashboard-ui'
import { PagedRows } from '@/components/paged-rows'
import { groupBySection, sellerOrderSection } from '@/lib/work-sections'
import { requireSeller } from '@/server/guards'
import { listNotifications } from '@/server/notifications'
import { listOwnedOrders, listOwnedProducts, sellerSnapshot } from '@/server/seller'

export default async function SellerDashboardPage() {
  const user = await requireSeller()

  const [summary, orders, products, notes] = await Promise.all([
    sellerSnapshot(user),
    listOwnedOrders(user),
    listOwnedProducts(user),
    listNotifications(user.id),
  ])
  const grouped = groupBySection(orders, sellerOrderSection)
  const needsYou = grouped['needs-you'] || []
  const activeOrders = grouped.active || []
  const completed = grouped.completed || []
  const activeProducts = products.filter((item) => item.status === 'active').length

  return (
    <DashboardShell
      user={user}
      title="Overview"
      subtitle="Orders that need you, deliveries in progress, and shop totals."
      variant="overview"
    >
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-4">
          <MetricBoard>
            <MetricTile section="Orders" label="Needs your action" value={needsYou.length} icon="clipboard" tone="amber" />
            <MetricTile section="Orders" label="Active orders" value={activeOrders.length} hint="Waiting on the courier" icon="truck" tone="blue" />
            <MetricTile section="Orders" label="Completed" value={completed.length} icon="package" tone="green" />
            <MetricTile section="Shop" label="Low stock" value={summary.lowStock} hint={`${activeProducts} active listings`} icon="boxes" tone="teal" />
          </MetricBoard>

          <div className={workGridClass}>
          <WorkSection
            title="Needs your action"
            description="Confirm, prepare, or finish these before anything else."
            count={needsYou.length}
            href="/seller/orders"
            linkLabel="Open orders"
            empty={<p className="text-sm text-[#5c6f62]">No orders are waiting on you.</p>}
          >
            <OrderPreview rows={needsYou} />
          </WorkSection>

          <WorkSection
            title="Active orders"
            description="Already moving. The courier updates these stages."
            count={activeOrders.length}
            href="/seller/orders"
            linkLabel="Open orders"
            empty={<p className="text-sm text-[#5c6f62]">No orders are in progress with a courier.</p>}
          >
            <OrderPreview rows={activeOrders} />
          </WorkSection>

          <WorkSection
            title="Completed"
            description="Orders you have finished."
            count={completed.length}
            href="/seller/earnings"
            linkLabel="View earnings"
            empty={<p className="text-sm text-[#5c6f62]">Completed orders will show up here.</p>}
          >
            <OrderPreview rows={completed} />
          </WorkSection>
          </div>

        </div>

        <aside className="space-y-4">
          <NotificationFeed notes={notes} />
          <QuickActions
            columns={1}
            actions={[
              { section: 'Shop', label: 'Add product', href: '/seller/products?new=1', icon: 'package' },
              { section: 'Shop', label: 'Inventory', href: '/seller/inventory', icon: 'boxes' },
              { section: 'Orders', label: 'Orders', href: '/seller/orders', icon: 'clipboard' },
              { section: 'Account', label: 'My shop', href: '/seller/shop', icon: 'user' },
            ]}
          />
        </aside>
      </div>
    </DashboardShell>
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
              {order.buyerName} · {order.fulfillment} · {peso(order.subtotal + order.deliveryFee)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <StatusBadge status={pretty(order.status)} />
            <a href={`/seller/orders?order=${encodeURIComponent(order.id)}`} className="text-sm font-bold text-[#4f8d3b]">
              Details
            </a>
          </div>
        </li>
      ))}
    </PagedRows>
  )
}
