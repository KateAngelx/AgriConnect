import { DashboardShell, peso, pretty } from '@/components/dashboard-shell'
import { MetricSection, MetricTile, NotificationFeed, QuickActions } from '@/components/dashboard-overview-ui'
import { StatusBadge, WorkSection } from '@/components/dashboard-ui'
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
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          <MetricSection title="Orders">
            <MetricTile label="Needs your action" value={needsYou.length} icon="clipboard" tone="amber" />
            <MetricTile label="Active orders" value={activeOrders.length} hint="Waiting on the courier" icon="truck" tone="blue" />
            <MetricTile label="Completed" value={completed.length} icon="package" tone="green" />
          </MetricSection>
          <MetricSection title="Shop" className="grid-cols-2">
            <MetricTile
              label="Low stock"
              value={summary.lowStock}
              hint={`${activeProducts} active listings`}
              icon="boxes"
              tone="teal"
            />
          </MetricSection>

          <WorkSection
            title="Needs your action"
            description="Confirm, prepare, or finish these before anything else."
            count={needsYou.length}
            href="/seller/orders"
            linkLabel="Open orders"
            empty={<p className="text-sm text-[#5c6f62]">No orders are waiting on you.</p>}
          >
            <OrderPreview rows={needsYou.slice(0, 4)} />
          </WorkSection>

          <WorkSection
            title="Active orders"
            description="Already moving. The courier updates these stages."
            count={activeOrders.length}
            href="/seller/orders"
            linkLabel="Open orders"
            empty={<p className="text-sm text-[#5c6f62]">No orders are in progress with a courier.</p>}
          >
            <OrderPreview rows={activeOrders.slice(0, 4)} />
          </WorkSection>

          <WorkSection
            title="Completed"
            description="Orders you have finished."
            count={completed.length}
            href="/seller/earnings"
            linkLabel="View earnings"
            empty={<p className="text-sm text-[#5c6f62]">Completed orders will show up here.</p>}
          >
            <OrderPreview rows={completed.slice(0, 4)} />
          </WorkSection>

          <QuickActions
            actions={[
              { section: 'Shop', label: 'Add product', href: '/seller/products?new=1', icon: 'package' },
              { section: 'Shop', label: 'Inventory', href: '/seller/inventory', icon: 'boxes' },
              { section: 'Orders', label: 'Orders', href: '/seller/orders', icon: 'clipboard' },
              { section: 'Account', label: 'Shop settings', href: '/seller/settings', icon: 'user' },
            ]}
          />
        </div>

        <aside className="space-y-6">
          <NotificationFeed notes={notes.slice(0, 5)} />
        </aside>
      </div>
    </DashboardShell>
  )
}

function OrderPreview({ rows }) {
  return (
    <ul className="ui-card divide-y divide-[#d5e4d4]">
      {rows.map((order) => (
        <li key={order.id} className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="font-semibold text-[#142016]">{order.reference}</p>
            <p className="text-[13px] text-[#5c6f62]">
              {order.buyerName} · {order.fulfillment} · {peso(order.subtotal + order.deliveryFee)}
            </p>
          </div>
          <StatusBadge status={pretty(order.status)} />
        </li>
      ))}
    </ul>
  )
}
