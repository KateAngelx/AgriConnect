import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DashboardShell, peso, pretty } from '@/components/dashboard-shell'
import { MetricSection, MetricTile, QuickActions } from '@/components/dashboard-overview-ui'
import { DashboardPanel, StatusBadge } from '@/components/dashboard-ui'
import { buyerOrderSection, groupBySection } from '@/lib/work-sections'
import { applicationsForUser } from '@/server/applications'
import { listOrders } from '@/server/orders'
import { canApplyForPartnerRole, isApprovedAdmin, isApprovedBuyer } from '@/server/roles'
import { listWishlist } from '@/server/wishlist'
import { requireUser } from '@/server/guards'
import { LocationMap } from '@/components/location-map'
import { Modal } from '@/components/modal'
import { PartnerApplication } from '@/components/partner-application'

export default async function AccountPage({ searchParams }) {
  const query = await searchParams
  const apply = query.apply === 'seller' || query.apply === 'delivery' ? query.apply : ''
  const user = await requireUser('/account')
  if (isApprovedAdmin(user)) redirect('/admin/dashboard')

  const [orders, wishlist, applications] = await Promise.all([
    isApprovedBuyer(user) ? listOrders(user.id) : Promise.resolve({ docs: [], totalDocs: 0 }),
    isApprovedBuyer(user) ? listWishlist(user.id) : Promise.resolve([]),
    applicationsForUser(user.id),
  ])
  const sellerApp = applications.find((item) => item.applicationType === 'seller')
  const deliveryApp = applications.find((item) => item.applicationType === 'delivery')
  const groupedOrders = groupBySection(orders.docs, buyerOrderSection)
  const activeOrders = groupedOrders.active || []
  const deliveredOrders = groupedOrders.delivered || []
  const recent = [...activeOrders, ...deliveredOrders].slice(0, 4)
  const waitingApplications = applications.filter((item) => ['pending', 'under-review', 'needs-info'].includes(item.status)).length
  const quickActions = [
    isApprovedBuyer(user) ? { section: 'Orders', label: 'My orders', href: '/buyer/orders', icon: 'clipboard' } : null,
    { section: 'Shopping', label: 'Browse products', href: '/products', icon: 'store' },
    isApprovedBuyer(user) ? { section: 'Shopping', label: 'Wishlist', href: '/wishlist', icon: 'heart' } : null,
    { section: 'Account', label: 'Account settings', href: '/account/settings', icon: 'user' },
    canApplyForPartnerRole(user, 'seller') && !sellerApp ? { section: 'Account', label: 'Apply to sell', href: '/account?apply=seller', icon: 'store' } : null,
    canApplyForPartnerRole(user, 'delivery') && !deliveryApp ? { section: 'Account', label: 'Apply to deliver', href: '/account?apply=delivery', icon: 'truck' } : null,
  ].filter(Boolean)

  return (
    <DashboardShell user={user} title="Overview" subtitle="Active orders, delivered orders, and applications still waiting." variant="overview">
      <div className="space-y-6">
        <MetricSection title="Orders" className="grid-cols-2">
          <MetricTile label="Active orders" value={activeOrders.length} icon="clipboard" tone="amber" />
          <MetricTile label="Delivered" value={deliveredOrders.length} icon="package" tone="green" />
        </MetricSection>
        <MetricSection title="Shopping" className="grid-cols-2">
          <MetricTile label="Wishlist items" value={wishlist.length} icon="heart" tone="teal" />
        </MetricSection>
        <MetricSection title="Account" className="grid-cols-2">
          <MetricTile label="Applications waiting" value={waitingApplications} hint={pretty(user.status)} icon="users" tone="blue" />
        </MetricSection>
      </div>

      {isApprovedBuyer(user) ? (
        <div className="mt-6">
          <DashboardPanel title="Saved delivery locations" action={<Link href="/account/settings" className="text-sm font-semibold text-brand-700">Manage locations</Link>}>
            {Array.isArray(user.savedAddresses) && user.savedAddresses.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {user.savedAddresses.slice(0, 4).map((location) => (
                  <div key={location.id} className="min-w-0">
                    <p className="mb-2 font-bold text-[#142016]">{location.label}</p>
                    <p className="mb-3 line-clamp-2 text-xs text-[#647066]">{location.address}</p>
                    <LocationMap lat={location.lat} lng={location.lng} height={180} label={location.label} kind="dropoff" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-brand-muted">
                No delivery pin saved yet.{' '}
                <Link href="/account/settings" className="font-semibold text-brand-700">
                  Add a location
                </Link>
              </p>
            )}
          </DashboardPanel>
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <DashboardPanel
          title="Orders"
          description="Active orders first, then ones you already received."
          action={
            <Link href="/buyer/orders" className="text-sm font-semibold text-brand-700">
              View all
            </Link>
          }
        >
          {recent.length ? (
            <ul className="divide-y divide-[#173c2c]/8 text-sm">
              {recent.map((order) => (
                <li key={order.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <Link href={`/buyer/orders?order=${encodeURIComponent(order.id)}`} className="font-bold text-brand-900 hover:text-brand-700">
                      {order.reference}
                    </Link>
                    <p className="text-xs text-brand-muted">{order.items.length} item{order.items.length === 1 ? '' : 's'} · {order.fulfillment}</p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={order.status} />
                    <p className="mt-1 text-xs font-semibold">{peso(order.subtotal + order.deliveryFee)}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-brand-muted">
              No orders yet.{' '}
              <Link href="/products" className="font-semibold text-brand-700">
                Browse products
              </Link>{' '}
              to start shopping.
            </p>
          )}
        </DashboardPanel>

        <div className="space-y-6">
          <QuickActions actions={quickActions} />
          {canApplyForPartnerRole(user, 'seller') || sellerApp || canApplyForPartnerRole(user, 'delivery') || deliveryApp ? (
            <DashboardPanel title="Applications">
              <div className="space-y-2 text-sm">
                {canApplyForPartnerRole(user, 'seller') || sellerApp ? (
                  <ApplicationRow label="Seller application" href="/account?apply=seller" application={sellerApp} />
                ) : null}
                {canApplyForPartnerRole(user, 'delivery') || deliveryApp ? (
                  <ApplicationRow label="Delivery application" href="/account?apply=delivery" application={deliveryApp} />
                ) : null}
              </div>
            </DashboardPanel>
          ) : null}
        </div>
      </div>

      {apply && canApplyForPartnerRole(user, apply) ? (
        <Modal
          title={apply === 'seller' ? 'Become a seller' : 'Become a delivery partner'}
          subtitle={apply === 'seller' ? 'Apply to sell on the marketplace. You can save a draft and finish later.' : 'Apply to deliver marketplace orders. You can save a draft and finish later.'}
          closeHref="/account"
        >
          <PartnerApplication
            kind={apply}
            userName={user.name}
            applications={applications}
            submitted={query.submitted === '1'}
          />
        </Modal>
      ) : null}
    </DashboardShell>
  )
}

function ApplicationRow({ label, href, application }) {
  if (!application) {
    return (
      <div className="flex items-center justify-between rounded-lg bg-[#f7f7f2] px-3 py-2">
        <span>{label}</span>
        <Link href={href} className="text-sm font-semibold text-brand-700">
          Start
        </Link>
      </div>
    )
  }
  return (
    <div className="flex items-center justify-between rounded-lg bg-[#f7f7f2] px-3 py-2">
      <span>{label}</span>
      <div className="flex items-center gap-2">
        <StatusBadge status={application.status} />
        <Link href={href} className="text-sm font-semibold text-brand-700">
          Open
        </Link>
      </div>
    </div>
  )
}
