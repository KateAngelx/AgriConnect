import Link from 'next/link'
import { BuyerOrderDetail } from '@/components/buyer-order-detail'
import { DashboardShell } from '@/components/dashboard-shell'
import { AlertBanner, PrimaryLink, StatusBadge, WorkSection, workGridClass } from '@/components/dashboard-ui'
import { Modal } from '@/components/modal'
import { PagedRows } from '@/components/paged-rows'
import { DashboardIcon } from '@/components/dashboard-icons'
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
    await Promise.all([confirmBuyerPayments(user.id), confirmXenditPayments(user.id)])
  }
  const orders = await listOrders(user.id, query.page)
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

      <div className="mb-4 flex justify-end">
        <PrimaryLink href="/products">Start shopping</PrimaryLink>
      </div>

      {orders.docs.length ? (
        <div className={workGridClass}>
          {sections.map(([key, title, description]) => {
            const rows = grouped[key] || []
            return (
              <WorkSection
                key={key}
                title={title}
                description={description}
                count={orders.sectionCounts[key]}
                fit
                empty={<p className="text-sm text-[#5c6f62]">Nothing in this section.</p>}
              >
                <PagedRows>
                  {rows.map((order) => (
                    <li key={order.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-[#142016]">{order.reference}</p>
                        <p className="text-[13px] text-[#5c6f62]">
                          {order.items.length} item{order.items.length === 1 ? '' : 's'} · {order.fulfillment} · {peso(order.subtotal + order.deliveryFee)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <StatusBadge status={order.status} />
                        <Link href={`/buyer/orders/${encodeURIComponent(order.id)}/receipt`} className="text-xs font-semibold text-[#2e7d32] hover:underline">
                          Receipt
                        </Link>
                        <Link href={`/buyer/orders?order=${encodeURIComponent(order.id)}`} className="grid size-9 place-items-center rounded-lg border border-[#d5e4d4] text-[#2e7d32] hover:bg-[#eef8e8]" aria-label={`View details for ${order.reference}`} title="View details">
                          <DashboardIcon name="eye" className="size-4" />
                        </Link>
                      </div>
                    </li>
                  ))}
                </PagedRows>
              </WorkSection>
            )
          })}
        </div>
      ) : (
        <div className={workGridClass}>
          <WorkSection
            title="Active orders"
            description="Placed and still on the way to you."
            count={0}
            empty={<p className="text-sm text-[#5c6f62]">No orders yet. Use Start shopping to browse the marketplace.</p>}
          />
        </div>
      )}

      {orders.totalPages > 1 ? (
        <nav className="mt-6 flex items-center justify-between gap-4" aria-label="Order history pages">
          {orders.page > 1 ? (
            <Link
              href={`/buyer/orders?page=${orders.page - 1}`}
              className="btn btn-secondary"
            >
              Previous orders
            </Link>
          ) : <span />}
          <p className="text-sm text-[#5c6f62]">
            Page {orders.page} of {orders.totalPages} · {orders.totalDocs} orders
          </p>
          {orders.page < orders.totalPages ? (
            <Link
              href={`/buyer/orders?page=${orders.page + 1}`}
              className="btn btn-secondary"
            >
              More orders
            </Link>
          ) : <span />}
        </nav>
      ) : null}

      {orderId ? (
        <Modal title={selected?.reference || 'Order'} subtitle="Items, payment, and where this order is going." closeHref={`/buyer/orders${orders.page > 1 ? `?page=${orders.page}` : ''}`} size="xl">
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
