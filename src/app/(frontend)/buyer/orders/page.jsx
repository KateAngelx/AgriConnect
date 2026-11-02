import Link from 'next/link'
import { BuyerOrderDetail } from '@/components/buyer-order-detail'
import { DashboardShell } from '@/components/dashboard-shell'
import { AlertBanner, PrimaryLink, StatusBadge, WorkSection } from '@/components/dashboard-ui'
import { Modal } from '@/components/modal'
import { peso } from '@/lib/dashboard-format'
import { buyerOrderSection, groupBySection } from '@/lib/work-sections'
import { assignmentForOrder } from '@/server/delivery'
import { requireApprovedBuyer } from '@/server/guards'
import { getOrder, listOrders } from '@/server/orders'
import { confirmBuyerPayments, confirmXenditPayments, paymentFor } from '@/server/payments'

const sections = [
  ['active', 'Active orders', 'Placed and still on the way to you.'],
  ['delivered', 'Delivered', 'Picked up, delivered, or marked complete.'],
  ['cancelled', 'Cancelled', 'Orders that were cancelled or could not be delivered.'],
]

export default async function BuyerOrdersPage({ searchParams }) {
  const user = await requireApprovedBuyer('/buyer/orders')
  const query = await searchParams
  if (query.payment === 'return') {
    await confirmBuyerPayments(user.id)
    await confirmXenditPayments(user.id)
  }
  const orders = await listOrders(user.id)
  const grouped = groupBySection(orders.docs, buyerOrderSection)
  const orderId = typeof query.order === 'string' ? query.order : ''
  const selected = orderId ? await getOrder(orderId, user.id) : null
  const [delivery, payment] = selected
    ? await Promise.all([assignmentForOrder(selected.id), paymentFor(selected.id)])
    : [null, null]
  const detailError = typeof query.error === 'string' ? query.error : ''
  const detailSuccess = typeof query.success === 'string' ? query.success : ''

  return (
    <DashboardShell user={user} title="My orders" subtitle="Active orders, delivered orders, and cancelled orders.">
      {query.payment === 'return' ? (
        <div className="mb-6">
          <AlertBanner tone="success">
            If the payment succeeded, this order will show as paid. Pending payments update automatically.
          </AlertBanner>
        </div>
      ) : null}
      {query.payment === 'cancelled' ? (
        <div className="mb-6">
          <AlertBanner tone="warning">
            Payment was cancelled and nothing was charged. The order is still reserved if you want to try again.
          </AlertBanner>
        </div>
      ) : null}

      {orders.docs.length ? (
        <div className="space-y-8">
          {sections.map(([key, title, description]) => {
            const rows = grouped[key] || []
            return (
              <WorkSection
                key={key}
                title={title}
                description={description}
                count={rows.length}
                empty={<p className="text-sm text-[#5c6f62]">Nothing in this section.</p>}
              >
                <ul className="space-y-3">
                  {rows.map((order) => (
                    <li key={order.id}>
                      <Link
                        href={`/buyer/orders?order=${encodeURIComponent(order.id)}`}
                        className="ui-card grid gap-4 p-5 transition hover:border-[#5dbb38] sm:grid-cols-[1fr_auto_auto] sm:items-center"
                      >
                        <div>
                          <StatusBadge status={order.status} />
                          <h3 className="mt-2 text-lg font-bold text-[#142016]">{order.reference}</h3>
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
              </WorkSection>
            )
          })}
        </div>
      ) : (
        <WorkSection
          title="Active orders"
          description="Placed and still on the way to you."
          count={0}
          empty={
            <div className="text-sm text-[#5c6f62]">
              <p>No orders yet.</p>
              <PrimaryLink href="/products" className="mt-4">Start shopping</PrimaryLink>
            </div>
          }
        />
      )}

      {orderId ? (
        <Modal title={selected?.reference || 'Order'} subtitle="Items, payment, and where this order is going." closeHref="/buyer/orders" size="xl">
          {selected ? (
            <BuyerOrderDetail order={selected} delivery={delivery} payment={payment} error={detailError} success={detailSuccess} />
          ) : (
            <p className="text-sm text-[#5c6f62]">This order is not on your account.</p>
          )}
        </Modal>
      ) : null}
    </DashboardShell>
  )
}
