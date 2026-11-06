import { notFound } from 'next/navigation'
import { ReceiptActions } from '@/components/receipt-actions'
import { peso } from '@/lib/dashboard-format'
import { formatDateTime } from '@/lib/date-time'
import { requireApprovedBuyer } from '@/server/guards'
import { getOrder } from '@/server/orders'
import { paymentFor } from '@/server/payments'

function paymentLabel(method) {
  const labels = {
    'cash-on-pickup': 'Cash on pickup',
    'cash-on-delivery': 'Cash on delivery',
    paymongo: 'PayMongo',
    xendit: 'Xendit',
  }
  return labels[method] || String(method || 'Not recorded').replaceAll('-', ' ')
}

export default async function OrderReceiptPage({ params }) {
  const { orderId } = await params
  const user = await requireApprovedBuyer(`/buyer/orders/${encodeURIComponent(orderId)}/receipt`)
  const order = await getOrder(orderId, user.id)
  if (!order) notFound()
  const payment = await paymentFor(order.id)
  const dateLabel = formatDateTime(order.createdAt) || 'Date not available'
  const total = order.subtotal + order.deliveryFee

  return (
    <main className="receipt-page mx-auto my-8 w-full max-w-3xl rounded-xl border border-brand-line bg-white p-6 shadow-sm sm:p-10">
      <div className="receipt-actions mb-8 flex flex-wrap items-center justify-between gap-3">
        <a href="/buyer/orders" className="btn btn-secondary">Back to orders</a>
        <ReceiptActions />
      </div>
      <header className="border-b border-brand-line pb-6">
        <p className="page-eyebrow">AgriConnect transaction receipt</p>
        <h1 className="page-title mt-2 text-3xl text-brand-900">Order {order.reference}</h1>
        <p className="mt-2 text-sm text-brand-muted">{dateLabel}</p>
      </header>

      <section className="grid gap-5 border-b border-brand-line py-6 sm:grid-cols-2">
        <div>
          <h2 className="text-sm font-bold text-brand-900">Buyer</h2>
          <p className="mt-2 text-sm text-brand-muted">{user.name}</p>
          {user.email ? <p className="text-sm text-brand-muted">{user.email}</p> : null}
          <p className="text-sm text-brand-muted">{order.contactNumber}</p>
        </div>
        <div>
          <h2 className="text-sm font-bold text-brand-900">
            {order.fulfillment === 'delivery' ? 'Delivery' : 'Pickup'}
          </h2>
          <p className="mt-2 text-sm text-brand-muted">
            {order.fulfillment === 'delivery'
              ? order.deliveryAddress
              : `${order.sellerPickup?.farmName || 'Seller'} · ${order.sellerPickup?.location || ''}`}
          </p>
          {(order.deliveryLandmark || order.sellerPickup?.landmark) ? (
            <p className="text-sm text-brand-muted">
              Landmark: {order.fulfillment === 'delivery' ? order.deliveryLandmark : order.sellerPickup.landmark}
            </p>
          ) : null}
        </div>
      </section>

      <section className="py-6">
        <h2 className="text-sm font-bold text-brand-900">Items</h2>
        <div className="mt-3 divide-y divide-brand-line">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between gap-4 py-3 text-sm">
              <div>
                <p className="font-semibold text-brand-900">
                  {typeof item.product === 'object' ? item.product.name : 'Product'}
                </p>
                <p className="text-brand-muted">{item.quantity} × {peso(item.unitPrice)}</p>
              </div>
              <strong>{peso(item.quantity * item.unitPrice)}</strong>
            </div>
          ))}
        </div>
        <div className="ml-auto mt-3 max-w-xs space-y-2 border-t border-brand-line pt-4 text-sm">
          <div className="flex justify-between"><span className="text-brand-muted">Subtotal</span><span>{peso(order.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-brand-muted">Delivery fee</span><span>{peso(order.deliveryFee)}</span></div>
          <div className="flex justify-between border-t border-brand-line pt-2 text-base font-bold"><span>Total</span><span>{peso(total)}</span></div>
        </div>
      </section>

      <section className="border-t border-brand-line pt-6">
        <h2 className="text-sm font-bold text-brand-900">Transaction</h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div><dt className="text-brand-muted">Payment method</dt><dd className="font-medium">{paymentLabel(payment?.method || order.paymentMethod)}</dd></div>
          <div><dt className="text-brand-muted">Payment status</dt><dd className="font-medium capitalize">{payment?.status || order.paymentStatus}</dd></div>
          {payment?.id ? <div><dt className="text-brand-muted">Transaction record</dt><dd className="break-all font-medium">{payment.id}</dd></div> : null}
          {payment?.providerReference ? <div><dt className="text-brand-muted">Provider reference</dt><dd className="break-all font-medium">{payment.providerReference}</dd></div> : null}
          <div><dt className="text-brand-muted">Order status</dt><dd className="font-medium capitalize">{order.status.replaceAll('-', ' ')}</dd></div>
        </dl>
      </section>
      <p className="mt-8 border-t border-brand-line pt-4 text-xs leading-5 text-brand-muted">
        Keep this receipt with your order reference for payment and support questions.
      </p>
    </main>
  )
}
