import { LocationMap } from '@/components/location-map'
import { LiveLocationRouteMap } from '@/components/live-location-route-map'
import { etaMinutesFromNow, formatEstimatedArrival } from '@/lib/delivery-eta'
import { AlertBanner, StatusBadge } from '@/components/dashboard-ui'
import { peso } from '@/lib/dashboard-format'
import { orderStatusLabel, stageIndex, stagesForFulfillment } from '@/lib/order-status'
import { cancelBuyerOrderAction } from '@/app/(frontend)/buyer/actions'
import { ConfirmButton } from '@/components/confirm-button'

function paymentLabel(method) {
  const key = String(method || '').toLowerCase()
  if (key.includes('cash')) return 'Cash'
  if (key === 'paymongo') return 'Online (GCash / Maya / card)'
  if (key === 'xendit') return 'Online (GCash / Maya / GrabPay / card)'
  return String(method || '').replaceAll('-', ' ')
}

export function BuyerOrderDetail({ order, delivery, payment, error = '', success = '' }) {
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
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={orderStatusLabel(order.status)} />
        {showEta ? (
          <span className="rounded-full bg-[#e8f5e3] px-3 py-1 text-sm font-semibold text-[#1b5e20]">
            {etaMinutes > 0 ? `Estimated arrival ~${etaMinutes} min · ${etaLabel}` : `Arriving ${etaLabel}`}
          </span>
        ) : null}
      </div>
      {error ? <AlertBanner tone="error">{error}</AlertBanner> : null}
      {success ? <AlertBanner tone="success">{success}</AlertBanner> : null}
      {order.status === 'placed' ? (
        <form action={cancelBuyerOrderAction}>
          <input type="hidden" name="orderId" value={order.id} />
          <ConfirmButton
            message="Cancel this order? Reserved stock will be returned."
            className="btn btn-danger"
          >
            Cancel order
          </ConfirmButton>
        </form>
      ) : null}
      {order.status === 'cancelled' ? (
        <AlertBanner tone="error">This order was cancelled and reserved stock was returned.</AlertBanner>
      ) : null}

      <section>
        <h3 className="text-sm font-bold text-[#142016]">Items</h3>
        <div className="mt-2 divide-y divide-[#d5e4d4]">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between gap-4 py-3">
              <div>
                <p className="font-semibold text-[#142016]">{typeof item.product === 'object' ? item.product.name : 'Product'}</p>
                <p className="text-sm text-[#5c6f62]">{item.quantity} × {peso(item.unitPrice)}</p>
              </div>
              <strong>{peso(item.quantity * item.unitPrice)}</strong>
            </div>
          ))}
        </div>
        <div className="space-y-1 border-t border-[#d5e4d4] pt-3 text-sm">
          <div className="flex justify-between"><span className="text-[#5c6f62]">Subtotal</span><span>{peso(order.subtotal)}</span></div>
          {order.deliveryFee > 0 ? (
            <div className="flex justify-between"><span className="text-[#5c6f62]">Delivery fee</span><span>{peso(order.deliveryFee)}</span></div>
          ) : null}
          <div className="flex justify-between text-base font-bold"><span>Total</span><span>{peso(order.subtotal + order.deliveryFee)}</span></div>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-bold text-[#142016]">{order.fulfillment === 'delivery' ? 'Delivery location' : 'Pickup location'}</h3>
        <p className="mt-2 text-sm text-[#5c6f62]">
          {order.fulfillment === 'delivery' ? order.deliveryAddress : `${pickup?.farmName || 'Seller'} · ${pickup?.location || ''}`}
        </p>
        {(order.deliveryLandmark || pickup?.landmark) ? (
          <p className="mt-1 text-sm text-[#5c6f62]">Landmark: {order.fulfillment === 'delivery' ? order.deliveryLandmark : pickup.landmark}</p>
        ) : null}
        <div className="mt-3">
          {order.fulfillment === 'delivery' ? (
            <LiveLocationRouteMap
              deliveryId={delivery?.id}
              pickupLat={pickup?.pickupLat}
              pickupLng={pickup?.pickupLng}
              deliveryLat={order.deliveryLat}
              deliveryLng={order.deliveryLng}
              initialCourierLat={delivery?.courierLat}
              initialCourierLng={delivery?.courierLng}
              height={220}
            />
          ) : (
            <LocationMap lat={mapLat} lng={mapLng} height={200} label="Pickup pin" kind="pickup" />
          )}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-bold text-[#142016]">Order progress</h3>
        <ol className="mt-3 space-y-2">
          {stages.map((stage, index) => {
            const done = index <= currentIndex
            return (
              <li key={stage} className="flex items-center gap-3 text-sm">
                <span className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${done ? 'bg-[#5dbb38] text-white' : 'bg-[#eef0ea] text-[#5c6f62]'}`}>
                  {index + 1}
                </span>
                <span className={done ? 'font-semibold text-[#142016]' : 'text-[#5c6f62]'}>{orderStatusLabel(stage)}</span>
              </li>
            )
          })}
        </ol>
        {payment ? (
          <p className="mt-4 border-t border-[#d5e4d4] pt-3 text-sm text-[#5c6f62]">
            Payment: {paymentLabel(payment.method)} · {payment.status} · {peso(payment.amount)}
          </p>
        ) : null}
        {delivery ? (
          <div className="mt-3 rounded-xl bg-[#f3f8ef] p-4">
            <p className="text-sm font-bold text-[#142016]">Delivery tracking</p>
            <p className="mt-1 text-sm text-[#5c6f62]">
              {delivery.courier?.name ? `Courier: ${delivery.courier.name}` : 'Waiting for a courier'} · {orderStatusLabel(delivery.status)}
            </p>
            <ul className="mt-2 space-y-1 text-sm text-[#5c6f62]">
              {(delivery.updates || []).map((update) => (
                <li key={`${update.at}-${update.status}`}>
                  {new Date(update.at).toLocaleString()} — {orderStatusLabel(update.status)}
                  {update.note ? ` · ${update.note}` : ''}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </div>
  )
}
