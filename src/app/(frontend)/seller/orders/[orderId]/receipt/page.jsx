import { notFound } from 'next/navigation'
import { ReceiptActions } from '@/components/receipt-actions'
import { peso } from '@/lib/dashboard-format'
import { formatDateTime } from '@/lib/date-time'
import { requireApprovedSeller } from '@/server/guards'
import { sellerOrderReceipt } from '@/server/seller'

function paymentLabel(method) {
  const labels = {
    'cash-on-pickup': 'Cash on pickup',
    'cash-on-delivery': 'Cash on delivery',
    paymongo: 'PayMongo',
    xendit: 'Xendit',
  }
  return labels[method] || String(method || 'Not recorded').replaceAll('-', ' ')
}

export default async function SellerOrderReceiptPage({ params }) {
  const { orderId } = await params
  const user = await requireApprovedSeller(`/seller/orders/${encodeURIComponent(orderId)}/receipt`)
  const receipt = await sellerOrderReceipt(user, orderId)
  if (!receipt) notFound()
  const dateLabel = formatDateTime(receipt.createdAt) || 'Date not available'

  return (
    <main className="receipt-page mx-auto my-8 w-full max-w-3xl rounded-xl border border-brand-line bg-white p-6 shadow-sm sm:p-10">
      <div className="receipt-actions mb-8 flex flex-wrap items-center justify-between gap-3">
        <a href="/seller/orders" className="btn btn-secondary">Back to orders</a>
        <ReceiptActions />
      </div>
      <header className="border-b border-brand-line pb-6">
        <p className="page-eyebrow">Seller transaction receipt</p>
        <h1 className="page-title mt-2 text-3xl text-brand-900">Order {receipt.reference}</h1>
        <p className="mt-2 text-sm text-brand-muted">{receipt.sellerName} · {dateLabel}</p>
      </header>

      <section className="py-6">
        <h2 className="text-sm font-bold text-brand-900">Your products in this order</h2>
        <div className="mt-3 divide-y divide-brand-line">
          {receipt.items.map((item) => (
            <div key={item.id} className="flex justify-between gap-4 py-3 text-sm">
              <div>
                <p className="font-semibold text-brand-900">{item.product?.name || 'Product'}</p>
                <p className="text-brand-muted">{item.quantity} × {peso(item.unitPrice)}</p>
              </div>
              <strong>{peso(item.quantity * item.unitPrice)}</strong>
            </div>
          ))}
        </div>
        <div className="ml-auto mt-3 max-w-xs space-y-2 border-t border-brand-line pt-4 text-sm">
          <div className="flex justify-between"><span className="text-brand-muted">Product sales</span><span>{peso(receipt.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-brand-muted">Platform commission</span><span>−{peso(receipt.commission)}</span></div>
          <div className="flex justify-between border-t border-brand-line pt-2 text-base font-bold"><span>Net earnings</span><span>{peso(receipt.earnings)}</span></div>
        </div>
      </section>

      <section className="border-t border-brand-line pt-6">
        <h2 className="text-sm font-bold text-brand-900">Transaction</h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div><dt className="text-brand-muted">Payment method</dt><dd className="font-medium">{paymentLabel(receipt.paymentMethod)}</dd></div>
          <div><dt className="text-brand-muted">Payment status</dt><dd className="font-medium capitalize">{receipt.paymentStatus}</dd></div>
          <div><dt className="text-brand-muted">Order status</dt><dd className="font-medium capitalize">{receipt.status.replaceAll('-', ' ')}</dd></div>
          <div><dt className="text-brand-muted">Fulfillment</dt><dd className="font-medium capitalize">{receipt.fulfillment}</dd></div>
          {receipt.transactionId ? <div><dt className="text-brand-muted">Transaction record</dt><dd className="break-all font-medium">{receipt.transactionId}</dd></div> : null}
          {receipt.providerReference ? <div><dt className="text-brand-muted">Provider reference</dt><dd className="break-all font-medium">{receipt.providerReference}</dd></div> : null}
        </dl>
      </section>
    </main>
  )
}
