import Link from 'next/link'
import { DashboardShell } from '@/components/dashboard-shell'
import { AlertBanner, EmptyState, PrimaryButton, StatusBadge } from '@/components/dashboard-ui'
import { peso } from '@/lib/dashboard-format'
import { requireApprovedBuyer } from '@/server/guards'
import { listOrders } from '@/server/orders'
import { confirmBuyerPayments, confirmXenditPayments } from '@/server/payments'

export default async function BuyerOrdersPage({ searchParams }) {
  const user = await requireApprovedBuyer('/buyer/orders')
  const query = await searchParams
  if (query.payment === 'return') {
    await confirmBuyerPayments(user.id)
    await confirmXenditPayments(user.id)
  }
  const orders = await listOrders(user.id)

  return (
    <DashboardShell user={user} title="My orders" subtitle="Track placed, in-progress, and completed purchases.">
      {query.payment === 'return' ? (
        <div className="mb-6">
          <AlertBanner tone="success">
            PayMongo payment confirmation is complete where payment was successful. Pending payments will update automatically from the secure webhook.
          </AlertBanner>
        </div>
      ) : null}
      {query.payment === 'cancelled' ? (
        <div className="mb-6">
          <AlertBanner tone="warning">
            Electronic payment was cancelled. Your reserved order items are ready, but payment was not taken.
          </AlertBanner>
        </div>
      ) : null}

      {orders.docs.length ? (
        <ul className="space-y-3">
          {orders.docs.map((order) => (
            <li key={order.id}>
              <Link
                href={`/buyer/orders/${order.id}`}
                className="grid gap-4 rounded-2xl border border-[#173c2c]/10 bg-white p-5 shadow-sm transition hover:border-[#5dbb38]/30 sm:grid-cols-[1fr_auto_auto] sm:items-center"
              >
                <div>
                  <StatusBadge status={order.status} />
                  <h2 className="mt-2 text-lg font-bold text-[#142016]">{order.reference}</h2>
                  <p className="mt-1 text-sm text-[#647066]">
                    {order.items.length} item{order.items.length === 1 ? '' : 's'} · {order.fulfillment}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-[#647066]">Payment</span>
                  <p className="font-bold capitalize text-[#142016]">{order.paymentStatus}</p>
                </div>
                <p className="text-xl font-bold">{peso(order.subtotal + order.deliveryFee)}</p>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title="No orders yet"
          action={
            <Link href="/products">
              <PrimaryButton type="button">Start shopping</PrimaryButton>
            </Link>
          }
        >
          Browse the marketplace and check out when you are ready.
        </EmptyState>
      )}
    </DashboardShell>
  )
}
