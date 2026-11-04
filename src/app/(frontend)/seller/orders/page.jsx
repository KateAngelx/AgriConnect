import { DashboardShell, peso, pretty } from '@/components/dashboard-shell'
import {
  AlertBanner,
  DarkButton,
  StatusBadge,
  WorkSection,
  workGridClass,
} from '@/components/dashboard-ui'
import { Modal } from '@/components/modal'
import { PagedRows } from '@/components/paged-rows'
import { requireApprovedSeller } from '@/server/guards'
import { ConfirmButton } from '@/components/confirm-button'
import { LocationMap } from '@/components/location-map'
import { LocationRouteMap } from '@/components/location-route-map'
import { listOwnedOrders, nextSellerAction } from '@/server/seller'
import { orderStatusLabel } from '@/lib/order-status'
import { groupBySection, sellerOrderSection } from '@/lib/work-sections'
import { advanceOrderAction, cancelOrderAction, collectOrderAction } from '@/app/(frontend)/seller/actions'

const sections = [
  ['needs-you', 'Needs your action', 'Confirm, prepare, hand off, or finish these orders.'],
  ['active', 'Active orders', 'The courier is handling these. You will be asked again when it is your turn.'],
  ['completed', 'Completed', 'Finished orders, including any pickup cash still to record.'],
  ['cancelled', 'Cancelled', 'These orders are closed and stock was returned when it was reserved.'],
]

export default async function SellerOrdersPage({ searchParams }) {
  const user = await requireApprovedSeller()
  const query = await searchParams
  const error = typeof query.error === 'string' ? query.error : ''
  const success = typeof query.success === 'string' ? query.success : ''
  const orders = await listOwnedOrders(user)
  const grouped = groupBySection(orders, sellerOrderSection)
  const orderId = typeof query.order === 'string' ? query.order : ''
  const selected = orders.find((order) => order.id === orderId) || null

  return (
    <DashboardShell user={user} title="Orders" subtitle="Orders that need you, ones still moving, and finished orders.">
      {error ? <div className="mb-6"><AlertBanner tone="error">{error}</AlertBanner></div> : null}
      {success ? <div className="mb-6"><AlertBanner tone="success">{success}</AlertBanner></div> : null}

      <div className={workGridClass}>
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
            </WorkSection>
          )
        })}
      </div>
      {orderId ? (
        <Modal
          title={selected?.reference || 'Order'}
          subtitle={selected ? `${selected.buyerName} · ${selected.fulfillment}` : 'This order is not in your shop.'}
          closeHref="/seller/orders"
          size="xl"
        >
          {selected ? <SellerOrderDetail order={selected} /> : <p className="text-sm text-[#5c6f62]">This order is not in your shop.</p>}
        </Modal>
      ) : null}
    </DashboardShell>
  )
}

function OrderRoute({ order }) {
  const pickup = order.sellerPickup
  if (order.fulfillment === 'delivery') {
    return (
      <div className="mt-4 space-y-2">
        <p className="text-sm text-[#142016]">Buyer drop-off: {order.deliveryAddress || 'Address not saved'}</p>
        <p className="text-sm text-[#5c6f62]">Seller pickup: {pickup?.farmName || 'Farm'} · {pickup?.location || 'Location not saved'}</p>
        <LocationRouteMap
          pickupLat={pickup?.pickupLat}
          pickupLng={pickup?.pickupLng}
          deliveryLat={order.deliveryLat}
          deliveryLng={order.deliveryLng}
          height={220}
        />
      </div>
    )
  }
  return (
    <div className="mt-4 space-y-2">
      <p className="text-sm text-[#142016]">Buyer pickup: {pickup?.farmName || 'Farm'} · {pickup?.location || 'Location not saved'}</p>
      <LocationMap lat={pickup?.pickupLat} lng={pickup?.pickupLng} height={200} label="Seller pickup" kind="pickup" />
    </div>
  )
}

function SellerOrderDetail({ order }) {
  const nextAction = nextSellerAction(order.fulfillment, order.status)
  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-3">
        <p className="text-sm text-[#5c6f62]">{pretty(order.paymentStatus)} payment</p>
        <div className="text-right">
          <StatusBadge status={pretty(order.status)} />
          <p className="mt-2 text-xl font-bold">{peso(order.subtotal + order.deliveryFee)}</p>
        </div>
      </div>
      <ul className="space-y-1 text-sm text-[#647066]">
        {order.items.map((item) => (
          <li key={item.id}>
            {item.quantity} × {item.product?.name} at {peso(item.unitPrice)}
          </li>
        ))}
      </ul>
      <OrderRoute order={order} />
      <div className="mt-4 flex flex-wrap gap-2">
        {nextAction ? (
          <form action={advanceOrderAction}>
            <input type="hidden" name="orderId" value={order.id} />
            <ConfirmButton
              type="submit"
              confirmLabel={nextAction.label}
              message={`Update this order to “${orderStatusLabel(nextAction.status)}”? The buyer will be notified.`}
              className="btn btn-dark"
            >
              {nextAction.label}
            </ConfirmButton>
          </form>
        ) : null}
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
            <ConfirmButton
              type="submit"
              danger
              confirmLabel="Cancel order"
              message="Cancel this order? Reserved stock will be returned to inventory."
              className="btn btn-danger"
            >
              Cancel order
            </ConfirmButton>
          </form>
        )}
      </div>
    </div>
  )
}
