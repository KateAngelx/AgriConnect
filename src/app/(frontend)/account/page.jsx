import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DashboardShell, peso } from '@/components/dashboard-shell'
import { DashboardPanel, StatCard, StatusBadge } from '@/components/dashboard-ui'
import { applicationsForUser } from '@/server/applications'
import { listOrders } from '@/server/orders'
import { isApprovedAdmin, isApprovedBuyer } from '@/server/roles'
import { listWishlist } from '@/server/wishlist'
import { requireUser } from '@/server/guards'

export default async function AccountPage() {
  const user = await requireUser('/account')
  if (isApprovedAdmin(user)) redirect('/admin/dashboard')

  const [orders, wishlist, applications] = await Promise.all([
    isApprovedBuyer(user) ? listOrders(user.id) : Promise.resolve({ docs: [], totalDocs: 0 }),
    isApprovedBuyer(user) ? listWishlist(user.id) : Promise.resolve([]),
    applicationsForUser(user.id),
  ])
  const sellerApp = applications.find((item) => item.applicationType === 'seller')
  const deliveryApp = applications.find((item) => item.applicationType === 'delivery')
  const recent = orders.docs.slice(0, 4)

  return (
    <DashboardShell user={user} title="Account overview" subtitle="Orders, wishlist, and partner applications at a glance.">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total orders" value={orders.totalDocs} />
        <StatCard label="Wishlist items" value={wishlist.length} />
        <StatCard label="Account status" value={user.status} />
        <StatCard label="Open applications" value={applications.filter((item) => ['pending', 'under-review', 'needs-info'].includes(item.status)).length} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <DashboardPanel
          title="Recent orders"
          action={
            <Link href="/buyer/orders" className="text-xs font-bold text-[#4b9f30]">
              View all
            </Link>
          }
        >
          {recent.length ? (
            <ul className="divide-y divide-[#173c2c]/8 text-sm">
              {recent.map((order) => (
                <li key={order.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <Link href={`/buyer/orders/${order.id}`} className="font-bold text-[#142016] hover:text-[#4b9f30]">
                      {order.reference}
                    </Link>
                    <p className="text-xs text-[#647066]">{order.items.length} item(s) · {order.fulfillment}</p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={order.status} />
                    <p className="mt-1 text-xs font-semibold">{peso(order.subtotal + order.deliveryFee)}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[#65766d]">No orders yet. Browse products to start shopping.</p>
          )}
        </DashboardPanel>

        <DashboardPanel title="Quick actions">
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              ['Browse products', '/products'],
              ['My orders', '/buyer/orders'],
              ['Wishlist', '/wishlist'],
              ['Account settings', '/account/settings'],
              ['Become a seller', '/account/become-seller'],
              ['Delivery partner', '/account/become-delivery'],
            ].map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="rounded-xl border border-[#173c2c]/10 bg-[#fafbfa] px-4 py-3 text-sm font-semibold text-[#142016] hover:bg-[#f3f6f2]"
              >
                {label}
              </Link>
            ))}
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <ApplicationRow label="Seller application" href="/account/become-seller" application={sellerApp} />
            <ApplicationRow label="Delivery application" href="/account/become-delivery" application={deliveryApp} />
          </div>
        </DashboardPanel>
      </div>
    </DashboardShell>
  )
}

function ApplicationRow({ label, href, application }) {
  if (!application) {
    return (
      <div className="flex items-center justify-between rounded-lg bg-[#f7f7f2] px-3 py-2">
        <span>{label}</span>
        <Link href={href} className="text-xs font-bold text-[#4b9f30]">
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
        <Link href={href} className="text-xs font-bold text-[#4b9f30]">
          View
        </Link>
      </div>
    </div>
  )
}
