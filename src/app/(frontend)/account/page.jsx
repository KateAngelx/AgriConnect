import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DashboardShell, peso } from '@/components/dashboard-shell'
import { MetricBoard, MetricTile, QuickActions } from '@/components/dashboard-overview-ui'
import { StatusBadge, WorkSection, workGridClass } from '@/components/dashboard-ui'
import { buyerOrderSection, groupBySection } from '@/lib/work-sections'
import { listOrders } from '@/server/orders'
import { isApprovedAdmin, isApprovedBuyer } from '@/server/roles'
import { listWishlist } from '@/server/wishlist'
import { requireUser } from '@/server/guards'
import { DashboardIcon } from '@/components/dashboard-icons'
import { PagedRows } from '@/components/paged-rows'

export default async function AccountPage() {
  const user = await requireUser('/account')
  if (isApprovedAdmin(user)) redirect('/admin/dashboard')

  const [orders, wishlist] = await Promise.all([
    isApprovedBuyer(user) ? listOrders(user.id) : Promise.resolve({ docs: [], totalDocs: 0 }),
    isApprovedBuyer(user) ? listWishlist(user.id) : Promise.resolve([]),
  ])
  const groupedOrders = groupBySection(orders.docs, buyerOrderSection)
  const activeOrders = groupedOrders.active || []
  const deliveredOrders = groupedOrders.delivered || []
  const allOrders = [...activeOrders, ...deliveredOrders]
  const quickActions = [
    isApprovedBuyer(user) ? { section: 'Orders', label: 'My orders', href: '/buyer/orders', icon: 'clipboard' } : null,
    { section: 'Shopping', label: 'Browse products', href: '/products', icon: 'store' },
    isApprovedBuyer(user) ? { section: 'Shopping', label: 'Wishlist', href: '/wishlist', icon: 'heart' } : null,
    isApprovedBuyer(user) ? { section: 'Account', label: 'Feedback', href: '/feedback', icon: 'clipboard' } : null,
    isApprovedBuyer(user) ? { section: 'Account', label: 'Report an issue', href: '/reports', icon: 'clipboard' } : null,
    { section: 'Account', label: 'Account settings', href: '/account/settings', icon: 'user' },
  ].filter(Boolean)

  return (
    <DashboardShell user={user} title="Overview" subtitle="Active orders, delivered orders, and saved items." variant="overview">
      <MetricBoard>
        <MetricTile section="Orders" label="Active orders" value={activeOrders.length} icon="clipboard" tone="amber" />
        <MetricTile section="Orders" label="Delivered" value={deliveredOrders.length} icon="package" tone="green" />
        <MetricTile section="Shopping" label="Wishlist items" value={wishlist.length} icon="heart" tone="teal" />
      </MetricBoard>

      <div className={`mt-4 ${workGridClass}`}>
        <WorkSection
          title="Orders"
          description="Active orders first, then ones you already received."
          count={allOrders.length}
          href="/buyer/orders"
          linkLabel="View all"
          empty={
            <p className="text-sm text-brand-muted">
              No orders yet.{' '}
              <Link href="/products" className="font-semibold text-brand-700">
                Browse products
              </Link>{' '}
              to start shopping.
            </p>
          }
        >
          {allOrders.length ? (
            <PagedRows className="divide-y divide-[#173c2c]/8 text-sm">
              {allOrders.map((order) => (
                <li key={order.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <Link href={`/buyer/orders?order=${encodeURIComponent(order.id)}`} className="font-bold text-brand-900 hover:text-brand-700">
                      {order.reference}
                    </Link>
                    <p className="text-xs text-brand-muted">{order.items.length} item{order.items.length === 1 ? '' : 's'} · {order.fulfillment}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-right">
                    <div>
                      <StatusBadge status={order.status} />
                      <p className="mt-1 text-xs font-semibold">{peso(order.subtotal + order.deliveryFee)}</p>
                    </div>
                    <Link href={`/buyer/orders?order=${encodeURIComponent(order.id)}`} className="grid size-9 place-items-center rounded-lg border border-[#d5e4d4] text-[#2e7d32] hover:bg-[#eef8e8]" aria-label={`View details for ${order.reference}`} title="View details">
                      <DashboardIcon name="eye" className="size-4" />
                    </Link>
                  </div>
                </li>
              ))}
            </PagedRows>
          ) : null}
        </WorkSection>

        <QuickActions actions={quickActions} />
      </div>
    </DashboardShell>
  )
}
