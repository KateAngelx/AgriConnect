import Link from 'next/link'
import { DashboardShell, greetingName, peso, pretty } from '@/components/dashboard-shell'
import {
  DashboardHero,
  MetricTile,
  NotificationFeed,
  OrderRow,
  OverviewPanel,
  PromoBanner,
  QuickActions,
} from '@/components/dashboard-overview-ui'
import { SellerProfileForm } from '@/components/profile-forms'
import { DataTable, StatusBadge } from '@/components/dashboard-ui'
import { requireSeller } from '@/server/guards'
import { listNotifications } from '@/server/notifications'
import { listOwnedOrders, listOwnedProducts, sellerRecord, sellerSnapshot } from '@/server/seller'
import { readyStore } from '@/server/store'
import { LocationMap } from '@/components/location-map'

export default async function SellerDashboardPage() {
  const user = await requireSeller()

  const [summary, store, orders, products, notes] = await Promise.all([
    sellerSnapshot(user),
    readyStore(),
    listOwnedOrders(user),
    listOwnedProducts(user),
    listNotifications(user.id),
  ])
  const seller = sellerRecord(store, user)
  const recentOrders = orders.slice(0, 5)
  const activeProducts = products.filter((item) => item.status === 'active').length
  const firstName = greetingName(user.name)

  return (
    <DashboardShell user={user} title="" subtitle="" variant="overview">
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          <DashboardHero
            label="Seller dashboard"
            title={`Good morning, ${firstName}!`}
            description={
              seller
                ? `Manage listings for ${seller.farmName}. Keep inventory fresh and fulfill buyer orders on time.`
                : 'Complete your farm profile, publish products, and start receiving orders from local buyers.'
            }
            actionHref="/seller/products/new"
            actionLabel="Add a product"
            imageUrl="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80"
          />

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricTile label="Total products" value={summary.products} icon="package" tone="green" />
            <MetricTile label="Active listings" value={activeProducts} icon="store" tone="teal" />
            <MetricTile
              label="Low stock items"
              value={summary.lowStock}
              hint="Below 10 units"
              icon="boxes"
              tone="amber"
            />
            <MetricTile label="Open orders" value={summary.openOrders} icon="clipboard" tone="blue" />
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <OverviewPanel title="Recent orders" href="/seller/orders">
              {recentOrders.length ? (
                <DataTable columns={['Order', 'Buyer', 'Fulfillment', 'Total', 'Status']}>
                  {recentOrders.map((order) => (
                    <OrderRow
                      key={order.id}
                      reference={order.reference}
                      buyer={order.buyerName}
                      seller={order.fulfillment}
                      total={peso(order.subtotal + order.deliveryFee)}
                      status={order.status}
                    />
                  ))}
                </DataTable>
              ) : (
                <p className="text-sm text-[#65766d]">Orders for your listings will show up here.</p>
              )}
            </OverviewPanel>

            <OverviewPanel title="Your listings" href="/seller/products">
              {products.length ? (
                <ul className="divide-y divide-[#173c2c]/8">
                  {products.slice(0, 5).map((product) => (
                    <li key={product.id} className="flex items-center justify-between gap-3 py-3 first:pt-0">
                      <div className="min-w-0">
                        <Link href={`/seller/products/${product.id}`} className="font-semibold text-[#142016] hover:text-[#4f8d3b]">
                          {product.name}
                        </Link>
                        <p className="text-xs text-[#65766d]">
                          {peso(product.price)} / {product.unit} · {product.stock} in stock
                        </p>
                      </div>
                      <StatusBadge status={pretty(product.status)} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[#65766d]">Create your first product to appear on the marketplace.</p>
              )}
            </OverviewPanel>
          </div>

          <OverviewPanel
            title="Farm pickup location"
            description="This pin is shared with buyers and delivery partners."
            href="/seller/settings"
            linkLabel="Edit pin"
          >
            <LocationMap lat={seller?.pickupLat} lng={seller?.pickupLng} height={240} label={`${seller?.farmName || 'Farm'} pickup pin`} />
          </OverviewPanel>

          <div className="grid gap-6 lg:grid-cols-2">
            <OverviewPanel title="Farm profile" description={seller ? `${seller.farmName} · ${seller.location}` : undefined}>
              <SellerProfileForm seller={seller} />
            </OverviewPanel>
            <QuickActions
              actions={[
                { label: 'New product', href: '/seller/products/new', icon: 'package' },
                { label: 'Update inventory', href: '/seller/inventory', icon: 'boxes' },
                { label: 'View orders', href: '/seller/orders', icon: 'clipboard' },
                { label: 'Marketplace', href: '/products', icon: 'store' },
              ]}
            />
          </div>

          <PromoBanner
            title="Grow your reach"
            body="Keep photos, prices, and stock updated so buyers trust your farm listings on AgriConnect."
            href="/seller/products"
            actionLabel="Manage products"
            imageUrl="https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=900&q=80"
          />
        </div>

        <aside className="space-y-6">
          <NotificationFeed notes={notes.slice(0, 5)} />
        </aside>
      </div>
    </DashboardShell>
  )
}
