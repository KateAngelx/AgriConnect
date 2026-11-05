import Link from 'next/link'
import { DashboardShell, peso, pretty } from '@/components/dashboard-shell'
import { AlertBanner, StatusBadge } from '@/components/dashboard-ui'
import { requireAdmin } from '@/server/guards'
import { listOrdersForAdmin } from '@/server/admin'

const statuses = [
  'all',
  'placed',
  'confirmed',
  'preparing',
  'ready-for-pickup',
  'awaiting-delivery',
  'picked-up',
  'delivered',
  'completed',
  'cancelled',
  'delivery-failed',
]
const fulfillmentOptions = ['all', 'pickup', 'delivery']

export default async function AdminOrdersPage({ searchParams }) {
  const user = await requireAdmin()
  const query = await searchParams
  const search = typeof query.q === 'string' ? query.q.trim() : ''
  const status = statuses.includes(query.status) ? query.status : 'all'
  const fulfillment = fulfillmentOptions.includes(query.fulfillment) ? query.fulfillment : 'all'
  const allOrders = await listOrdersForAdmin()
  const normalizedSearch = search.toLocaleLowerCase()
  const orders = allOrders.filter((order) => {
    const matchesSearch =
      !normalizedSearch ||
      [order.reference, order.buyer, order.seller, order.id].some((value) =>
        String(value || '')
          .toLocaleLowerCase()
          .includes(normalizedSearch),
      )
    return (
      matchesSearch &&
      (status === 'all' || order.status === status) &&
      (fulfillment === 'all' || order.fulfillment === fulfillment)
    )
  })

  return (
    <DashboardShell
      user={user}
      title="Order monitoring"
      subtitle="Monitor marketplace orders, fulfillment progress, reported issues, and related transactions. Sellers continue to fulfill their own orders."
    >
      {typeof query.error === 'string' ? (
        <div className="mb-4">
          <AlertBanner tone="error">{query.error}</AlertBanner>
        </div>
      ) : null}
      {typeof query.success === 'string' ? (
        <div className="mb-4">
          <AlertBanner tone="success">{query.success}</AlertBanner>
        </div>
      ) : null}

      <form
        method="get"
        className="ui-card mb-4 grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_12rem_12rem_auto] sm:items-end"
      >
        <label className="grid gap-1 text-sm font-medium text-brand-900">
          Search orders
          <input
            type="search"
            name="q"
            defaultValue={search}
            placeholder="Order number, buyer, or seller"
            className="min-h-11 rounded-xl border border-brand-line bg-white px-3"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-brand-900">
          Fulfillment
          <select
            name="fulfillment"
            defaultValue={fulfillment}
            className="min-h-11 rounded-xl border border-brand-line bg-white px-3"
          >
            {fulfillmentOptions.map((value) => (
              <option key={value} value={value}>
                {value === 'all' ? 'All methods' : pretty(value)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-brand-900">
          Order status
          <select
            name="status"
            defaultValue={status}
            className="min-h-11 rounded-xl border border-brand-line bg-white px-3"
          >
            {statuses.map((value) => (
              <option key={value} value={value}>
                {value === 'all' ? 'All statuses' : pretty(value)}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn btn-primary">
          Filter orders
        </button>
      </form>

      <section className="ui-card overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-brand-line px-4 py-3 sm:px-5">
          <div>
            <h2 className="text-lg font-semibold text-brand-900">Marketplace orders</h2>
            <p className="text-sm text-brand-muted">
              {orders.length} of {allOrders.length} orders
            </p>
          </div>
          {search || status !== 'all' || fulfillment !== 'all' ? (
            <Link href="/admin/orders" className="text-sm font-semibold text-brand-700">
              Clear filters
            </Link>
          ) : null}
        </div>
        {orders.length ? (
          <ul className="divide-y divide-brand-line">
            {orders.map((order) => (
              <li key={order.id} className="px-4 py-4 sm:px-5">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-brand-900">{order.reference}</h3>
                    <p className="text-sm text-brand-muted">
                      Buyer: {order.buyer} · Seller: {order.seller}
                    </p>
                    <p className="mt-1 text-sm text-brand-muted">
                      {order.createdAt
                        ? new Date(order.createdAt).toLocaleString('en-PH')
                        : 'Date unavailable'}{' '}
                      · {pretty(order.fulfillment)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={pretty(order.status)} />
                    <StatusBadge status={`Payment ${pretty(order.paymentStatus)}`} />
                  </div>
                  <p className="text-lg font-bold text-brand-900">{peso(order.total)}</p>
                </div>
                <details className="mt-3">
                  <summary className="w-fit cursor-pointer text-sm font-semibold text-brand-700">
                    View order details and transactions
                  </summary>
                  <div className="mt-3 grid gap-4 rounded-xl bg-[#f7fbf4] p-4 lg:grid-cols-2">
                    <div>
                      <h4 className="font-semibold text-brand-900">Order items</h4>
                      <ul className="mt-2 divide-y divide-brand-line">
                        {order.items.map((item, index) => (
                          <li
                            key={`${order.id}-${index}`}
                            className="flex justify-between gap-3 py-2 text-sm"
                          >
                            <span>
                              {item.name} · {item.seller}
                              <span className="block text-brand-muted">
                                {item.quantity} × {peso(item.unitPrice)}
                              </span>
                            </span>
                            <strong>{peso(item.quantity * item.unitPrice)}</strong>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 text-sm text-brand-muted">
                        Subtotal {peso(order.subtotal)}
                        {order.deliveryFee ? ` · Delivery ${peso(order.deliveryFee)}` : ''}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-brand-900">Transaction records</h4>
                      {order.transactions.length ? (
                        <ul className="mt-2 space-y-2">
                          {order.transactions.map((transaction) => (
                            <li
                              key={transaction.id}
                              className="rounded-lg border border-brand-line bg-white p-3 text-sm"
                            >
                              <p className="font-semibold text-brand-900">
                                {pretty(transaction.method)} · {peso(transaction.amount)} ·{' '}
                                {pretty(transaction.status)}
                              </p>
                              <p className="mt-1 text-brand-muted">
                                {pretty(transaction.provider)}
                                {transaction.reference
                                  ? ` · Reference ${transaction.reference}`
                                  : ''}
                              </p>
                              <p className="text-xs text-brand-muted">
                                Transaction {transaction.id}
                                {transaction.createdAt
                                  ? ` · ${new Date(transaction.createdAt).toLocaleString('en-PH')}`
                                  : ''}
                              </p>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-sm text-brand-muted">
                          No transaction record is available for this order.
                        </p>
                      )}
                      {order.reportedCount ? (
                        <p className="mt-3 text-sm text-brand-muted">
                          {order.reportedCount} order issue{order.reportedCount === 1 ? '' : 's'}{' '}
                          reported.{' '}
                          <Link
                            href={`/admin/buyer-reports?targetId=${encodeURIComponent(order.id)}`}
                            className="font-semibold text-brand-700"
                          >
                            Review reports
                          </Link>
                        </p>
                      ) : (
                        <p className="mt-3 text-sm text-brand-muted">No order reports.</p>
                      )}
                    </div>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-6 text-sm text-brand-muted">No orders match these filters.</p>
        )}
      </section>
    </DashboardShell>
  )
}
