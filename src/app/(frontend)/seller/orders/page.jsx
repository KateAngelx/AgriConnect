import { DashboardShell, peso, pretty } from '@/components/dashboard-shell'
import {
  AlertBanner,
  DarkButton,
  DashboardPanel,
  EmptyState,
  StatusBadge,
} from '@/components/dashboard-ui'
import { requireApprovedSeller } from '@/server/guards'
import { ConfirmButton } from '@/components/confirm-button'
import { listOwnedOrders } from '@/server/seller'
import { advanceOrderAction, cancelOrderAction, collectOrderAction } from '@/app/(frontend)/seller/actions'

export default async function SellerOrdersPage({ searchParams }) {
  const user = await requireApprovedSeller()
  const query = await searchParams
  const error = typeof query.error === 'string' ? query.error : ''
  const success = typeof query.success === 'string' ? query.success : ''
  const orders = await listOwnedOrders(user)

  return (
    <DashboardShell user={user} title="Orders" subtitle="Confirm, prepare, complete, or cancel incoming orders.">
      {error ? <div className="mb-6"><AlertBanner tone="error">{error}</AlertBanner></div> : null}
      {success ? <div className="mb-6"><AlertBanner tone="success">{success}</AlertBanner></div> : null}

      {orders.length ? (
        <div className="space-y-4">
          {orders.map((order) => (
            <DashboardPanel
              key={order.id}
              title={order.reference}
              description={`${order.buyerName} · ${order.fulfillment} · ${pretty(order.paymentStatus)} payment`}
              action={
                <div className="text-right">
                  <StatusBadge status={pretty(order.status)} />
                  <p className="mt-2 text-xl font-bold">{peso(order.subtotal + order.deliveryFee)}</p>
                </div>
              }
            >
              <ul className="space-y-1 text-sm text-[#647066]">
                {order.items.map((item) => (
                  <li key={item.id}>
                    {item.quantity} × {item.product?.name} at {peso(item.unitPrice)}
                  </li>
                ))}
              </ul>
              {order.deliveryAddress ? <p className="mt-3 text-sm text-[#142016]">{order.deliveryAddress}</p> : null}
              <div className="mt-4 flex flex-wrap gap-2">
                {!['completed', 'cancelled', 'out-for-delivery', 'awaiting-delivery'].includes(order.status) && (
                  <form action={advanceOrderAction}>
                    <input type="hidden" name="orderId" value={order.id} />
                    <ConfirmButton type="submit" message="Advance this order to the next fulfillment stage?" className="rounded-full bg-[#173c2c] px-4 py-2 text-xs font-bold text-white">
                      Advance order
                    </ConfirmButton>
                  </form>
                )}
                {order.fulfillment === 'pickup' &&
                  ['picked-up', 'completed'].includes(order.status) &&
                  order.paymentStatus !== 'paid' && (
                    <form action={collectOrderAction}>
                      <input type="hidden" name="orderId" value={order.id} />
                      <DarkButton type="submit">Record cash payment</DarkButton>
                    </form>
                  )}
                {!['completed', 'delivered', 'picked-up', 'out-for-delivery', 'cancelled'].includes(order.status) && (
                  <form action={cancelOrderAction}>
                    <input type="hidden" name="orderId" value={order.id} />
                    <ConfirmButton type="submit" message="Cancel this order? Reserved stock will be returned to inventory." className="rounded-full bg-[#fff1ed] px-4 py-2 text-xs font-bold text-[#963b2d]">
                      Cancel order
                    </ConfirmButton>
                  </form>
                )}
              </div>
            </DashboardPanel>
          ))}
        </div>
      ) : (
        <EmptyState title="No orders yet">Buyer orders for your listings will show up here.</EmptyState>
      )}
    </DashboardShell>
  )
}
