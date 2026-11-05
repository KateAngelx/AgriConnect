import { notFound } from 'next/navigation'
import { ReceiptActions } from '@/components/receipt-actions'
import { peso, pretty } from '@/lib/dashboard-format'
import { adminTransactionReceipt } from '@/server/admin'
import { requireAdmin } from '@/server/guards'

export default async function AdminTransactionReceiptPage({ params }) {
  const { paymentId } = await params
  const user = await requireAdmin()
  const receipt = await adminTransactionReceipt(user, paymentId)
  if (!receipt) notFound()
  const { transaction, order, buyer } = receipt
  const transactionDate = transaction.createdAt ? new Date(transaction.createdAt) : null
  const dateLabel =
    transactionDate && !Number.isNaN(transactionDate.getTime())
      ? transactionDate.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })
      : 'Date not available'

  return (
    <main className="receipt-page mx-auto my-8 w-full max-w-3xl rounded-xl border border-brand-line bg-white p-6 shadow-sm sm:p-10">
      <div className="receipt-actions mb-8 flex flex-wrap items-center justify-between gap-3">
        <a href="/admin/payments" className="btn btn-secondary">
          Back to transactions
        </a>
        <ReceiptActions />
      </div>
      <header className="border-b border-brand-line pb-6">
        <p className="page-eyebrow">AgriConnect transaction record</p>
        <h1 className="page-title mt-2 text-3xl text-brand-900">Transaction receipt</h1>
        <p className="mt-2 break-all text-sm font-medium text-brand-muted">{transaction.id}</p>
        <p className="mt-1 text-sm text-brand-muted">{dateLabel}</p>
      </header>

      <section className="grid gap-5 border-b border-brand-line py-6 sm:grid-cols-2">
        <div>
          <h2 className="text-sm font-bold text-brand-900">Order</h2>
          <p className="mt-2 text-sm text-brand-muted">{order.reference}</p>
          <p className="text-sm text-brand-muted">
            {pretty(order.fulfillment)} · {pretty(order.status)}
          </p>
        </div>
        <div>
          <h2 className="text-sm font-bold text-brand-900">Buyer</h2>
          <p className="mt-2 text-sm text-brand-muted">{buyer.name}</p>
        </div>
      </section>

      <section className="py-6">
        <h2 className="text-sm font-bold text-brand-900">Order items</h2>
        <ul className="mt-3 divide-y divide-brand-line">
          {order.items.map((item, index) => (
            <li key={`${order.id}-${index}`} className="flex justify-between gap-4 py-3 text-sm">
              <span>
                {item.name}
                <span className="block text-brand-muted">
                  {item.quantity} × {peso(item.unitPrice)}
                </span>
              </span>
              <strong>{peso(item.quantity * item.unitPrice)}</strong>
            </li>
          ))}
        </ul>
        <div className="ml-auto mt-3 max-w-xs space-y-2 border-t border-brand-line pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-brand-muted">Order subtotal</span>
            <span>{peso(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-brand-muted">Delivery fee</span>
            <span>{peso(order.deliveryFee)}</span>
          </div>
          <div className="flex justify-between border-t border-brand-line pt-2 font-semibold">
            <span>Order total</span>
            <span>{peso(order.subtotal + order.deliveryFee)}</span>
          </div>
        </div>
      </section>

      <section className="border-t border-brand-line pt-6">
        <h2 className="text-sm font-bold text-brand-900">Recorded transaction</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <Detail label="Transaction amount" value={peso(transaction.amount)} />
          <Detail label="Payment status" value={pretty(transaction.status)} />
          <Detail label="Payment method" value={pretty(transaction.method)} />
          <Detail label="Provider" value={pretty(transaction.provider)} />
          {transaction.providerReference ? (
            <Detail label="Provider reference" value={transaction.providerReference} />
          ) : null}
          <Detail label="Order payment status" value={pretty(order.paymentStatus)} />
        </dl>
        <p className="mt-4 rounded-lg bg-[#f7fbf4] p-3 text-xs leading-5 text-brand-muted">
          Transaction amount and status are copied from the saved payment record. Viewing or
          printing this receipt does not change payment status.
        </p>
      </section>
    </main>
  )
}

function Detail({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="text-brand-muted">{label}</dt>
      <dd className="mt-1 break-words font-medium text-brand-900">{value}</dd>
    </div>
  )
}
