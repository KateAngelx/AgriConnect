import Link from 'next/link'
import { notFound } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard-shell'
import { LocationMap } from '@/components/location-map'
import { LocationRouteMap } from '@/components/location-route-map'
import { etaMinutesFromNow, formatEstimatedArrival } from '@/lib/delivery-eta'
import { AlertBanner, DashboardPanel, StatusBadge } from '@/components/dashboard-ui'
import { peso } from '@/lib/dashboard-format'
import {
  orderStatusLabel,
  stageIndex,
  stagesForFulfillment,
} from '@/lib/order-status'
import { requireApprovedBuyer } from '@/server/guards'
import { cancelBuyerOrderAction } from '@/app/(frontend)/buyer/actions'
import { ConfirmButton } from '@/components/confirm-button'
import { assignmentForOrder } from '@/server/delivery'
import { getOrder } from '@/server/orders'
import { paymentFor } from '@/server/payments'

function paymentLabel(method) {
  const key = String(method || '').toLowerCase()
  if (key.includes('cash')) return 'Cash'
  if (key === 'paymongo') return 'Online (GCash / Maya / card)'
  if (key === 'xendit') return 'Online (GCash / Maya / GrabPay / card)'
  return method.replaceAll('-', ' ')
}

export default async function BuyerOrderPage({ params, searchParams }) {
  const user = await requireApprovedBuyer()
  const { orderId } = await params
  const query = await searchParams
  const order = await getOrder(orderId, user.id)
  if (!order) notFound()
  const [delivery, payment] = await Promise.all([assignmentForOrder(order.id), paymentFor(order.id)])
  const stages = stagesForFulfillment(order.fulfillment)
  const currentIndex = stageIndex(stages, order.status)
  const pickup = order.sellerPickup
  const mapLat = order.fulfillment === 'delivery' ? order.deliveryLat : pickup?.pickupLat
  const mapLng = order.fulfillment === 'delivery' ? order.deliveryLng : pickup?.pickupLng
  const etaLabel = formatEstimatedArrival(order.estimatedArrivalAt)
  const etaMinutes = etaMinutesFromNow(order.estimatedArrivalAt)
  const showEta =
    order.fulfillment === 'delivery' &&
    etaLabel &&
    !['delivered', 'completed', 'cancelled'].includes(order.status)

  return (
    <DashboardShell user={user} title={order.reference} subtitle="Order details, payment, and tracking.">
      <Link href="/buyer/orders" className="text-sm font-bold text-[#4b9f30]">
        ← My orders
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <StatusBadge status={orderStatusLabel(order.status)} />
        {showEta ? (
          <span className="rounded-full bg-[#eef8e8] px-4 py-1.5 text-sm font-semibold text-[#2d6b1f]">
            {etaMinutes > 0 ? `Estimated arrival ~${etaMinutes} min · ${etaLabel}` : `Arriving ${etaLabel}`}
          </span>
        ) : null}
      </div>

      {query.error ? <div className="mt-6"><AlertBanner tone="error">{query.error}</AlertBanner></div> : null}
      {query.success ? <div className="mt-6"><AlertBanner tone="success">{query.success}</AlertBanner></div> : null}
      {order.status === 'placed' ? (
        <form action={cancelBuyerOrderAction} className="mt-6">
          <input type="hidden" name="orderId" value={order.id} />
          <ConfirmButton
            message="Cancel this order? Reserved stock will be returned."
            className="rounded-full bg-[#fff1ed] px-4 py-2 text-sm font-bold text-[#963b2d]"
          >
            Cancel order
          </ConfirmButton>
        </form>
      ) : null}
      {order.status === 'cancelled' ? (
        <div className="mt-6">
          <AlertBanner tone="error">This order was cancelled and reserved stock was returned.</AlertBanner>
        </div>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <DashboardPanel title="Items">
          <div className="divide-y divide-[#173c2c]/8">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between gap-4 py-4 first:pt-0 last:pb-0">
                <div>
                  <strong className="text-[#142016]">
                    {typeof item.product === 'object' ? item.product.name : 'Product'}
                  </strong>
                  <p className="text-sm text-[#647066]">
                    {item.quantity} × {peso(item.unitPrice)}
                  </p>
                </div>
                <strong>{peso(item.quantity * item.unitPrice)}</strong>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-1 border-t border-[#173c2c]/10 pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-[#647066]">Subtotal</span>
              <span>{peso(order.subtotal)}</span>
            </div>
            {order.deliveryFee > 0 ? (
              <div className="flex justify-between">
                <span className="text-[#647066]">Delivery fee</span>
                <span>{peso(order.deliveryFee)}</span>
              </div>
            ) : null}
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>{peso(order.subtotal + order.deliveryFee)}</span>
            </div>
          </div>
        </DashboardPanel>

        <DashboardPanel title={order.fulfillment === 'delivery' ? 'Delivery location' : 'Pickup location'}>
          <p className="text-sm text-[#647066]">
            {order.fulfillment === 'delivery'
              ? order.deliveryAddress
              : `${pickup?.farmName || 'Seller'} · ${pickup?.location || ''}`}
          </p>
          {(order.deliveryLandmark || pickup?.landmark) && (
            <p className="mt-2 text-sm text-[#647066]">
              Landmark: {order.fulfillment === 'delivery' ? order.deliveryLandmark : pickup.landmark}
            </p>
          )}
          <div className="mt-4">
            {order.fulfillment === 'delivery' ? (
              <LocationRouteMap
                pickupLat={pickup?.pickupLat}
                pickupLng={pickup?.pickupLng}
                deliveryLat={order.deliveryLat}
                deliveryLng={order.deliveryLng}
              />
            ) : (
              <LocationMap lat={mapLat} lng={mapLng} label="Pickup pin" />
            )}
          </div>
        </DashboardPanel>
      </div>

      <div className="mt-6">
      <DashboardPanel title="Order progress">
        <ol className="space-y-3">
          {stages.map((stage, index) => {
            const done = index <= currentIndex
            return (
              <li key={stage} className="flex items-center gap-3 text-sm">
                <span
                  className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${done ? 'bg-[#5dbb38] text-white' : 'bg-[#eef0ea] text-[#647066]'}`}
                >
                  {index + 1}
                </span>
                <span className={done ? 'font-semibold text-[#142016]' : 'text-[#647066]'}>
                  {orderStatusLabel(stage)}
                </span>
              </li>
            )
          })}
        </ol>
        {payment ? (
          <p className="mt-5 border-t border-[#173c2c]/10 pt-4 text-sm text-[#647066]">
            Payment: {paymentLabel(payment.method)} · {payment.status} · {peso(payment.amount)}
          </p>
        ) : null}
        {delivery ? (
          <div className="mt-4 rounded-xl bg-[#f7f7f2] p-4">
            <h3 className="text-sm font-bold text-[#142016]">Delivery tracking</h3>
            <p className="mt-2 text-sm text-[#647066]">
              {delivery.courier?.name ? `Courier: ${delivery.courier.name}` : 'Waiting for a courier'} ·{' '}
              {orderStatusLabel(delivery.status)}
            </p>
            <ul className="mt-3 space-y-2 text-sm text-[#647066]">
              {(delivery.updates || []).map((update) => (
                <li key={`${update.at}-${update.status}`}>
                  {new Date(update.at).toLocaleString()} — {orderStatusLabel(update.status)}
                  {update.note ? ` · ${update.note}` : ''}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </DashboardPanel>
      </div>
    </DashboardShell>
  )
}
