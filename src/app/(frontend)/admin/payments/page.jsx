import { payCommissionAction, payPlatformCommissionAction, paySellerAction } from '@/app/(frontend)/admin/actions'
import { DashboardShell, peso, pretty } from '@/components/dashboard-shell'
import { PeriodFilter } from '@/components/period-filter'
import { AlertBanner, StatusBadge, WorkSection, workGridClass } from '@/components/dashboard-ui'
import { PagedRows } from '@/components/paged-rows'
import { inPeriod, periodLabel, readPeriod } from '@/lib/report-period'
import { listAssignments, moneyLedger, platformCommissionLedger } from '@/server/admin'
import { MoneySummary } from '@/components/money-breakdown'
import { requireAdmin } from '@/server/guards'
import { commissionRate, listPayments } from '@/server/payments'
import { freshStore } from '@/server/store'
import { SubmitButton } from '@/components/submit-button'

export default async function AdminPaymentsPage({ searchParams }) {
  const user = await requireAdmin()

  const query = await searchParams
  const error = typeof query.error === 'string' ? query.error : ''
  const success = typeof query.success === 'string' ? query.success : ''
  const period = readPeriod(query.period)
  const [payments, deliveries, store, ledger, rate] = await Promise.all([
    listPayments(),
    listAssignments(),
    freshStore(),
    moneyLedger(period),
    commissionRate(),
  ])
  const sellerNames = (order) =>
    [...new Set((order.items || []).map((item) => item.sellerId || item.product?.seller?.id).filter(Boolean))]
      .map((id) => store.sellers.find((entry) => entry.id === id)?.farmName || 'Seller')
      .join(', ') || 'Seller'
  const itemCount = (order) => (order.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
  const platformLedger = platformCommissionLedger(store)
  const paymentsInRange = payments.filter((payment) => inPeriod(payment.createdAt, period))
  const paymentStatuses = [
    ...new Set(payments.map((payment) => payment.status || 'unknown')),
  ].sort()
  const paymentStatus = paymentStatuses.includes(query.paymentStatus) ? query.paymentStatus : 'all'
  const validDate = (value) => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return ''
    const date = new Date(`${value}T00:00:00.000Z`)
    return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? '' : value
  }
  const dateFrom = validDate(query.from)
  const dateTo = validDate(query.to)
  const transactionRows = paymentsInRange.filter((payment) => {
    const date = String(payment.createdAt || '').slice(0, 10)
    return (
      (paymentStatus === 'all' || (payment.status || 'unknown') === paymentStatus) &&
      (!dateFrom || date >= dateFrom) &&
      (!dateTo || date <= dateTo)
    )
  })
  const deliveriesInRange = deliveries.filter((delivery) =>
    inPeriod(delivery.updatedAt || delivery.order?.createdAt, period),
  )
  const readyToPay = deliveries.filter(
    (delivery) =>
      // The courier's proof photo completes the order; that is all a courier payout needs.
      ['delivered', 'completed'].includes(delivery.status) &&
      delivery.order?.status === 'completed' &&
      delivery.proofOfDelivery?.url &&
      delivery.courierPaymentStatus !== 'released' &&
      delivery.commissionStatus !== 'paid',
  )
  // Most recently released first, so a payout just marked paid is at the top.
  const paidOut = deliveriesInRange
    .filter((delivery) => delivery.commissionStatus === 'paid')
    .sort((a, b) =>
      String(b.courierReleasedAt || b.updatedAt || '').localeCompare(String(a.courierReleasedAt || a.updatedAt || '')),
    )

  return (
    <DashboardShell
      user={user}
      title="Transactions and payouts"
      subtitle={`${periodLabel(period)} · transaction records, platform commission, and courier payouts.`}
    >
      <div className="mb-4">
        <PeriodFilter period={period} pathname="/admin/payments" />
      </div>
      <section className="ui-card mb-4 p-4 sm:p-5">
        <h2 className="text-[17px] font-semibold text-[#142016]">Money summary · {periodLabel(period)}</h2>
        <p className="mb-4 text-[13px] text-[#5c6f62]">What buyers pay and how it is split. The lists below are what you still need to release or collect.</p>
        <MoneySummary totals={ledger.totals} commissionRate={rate} />
      </section>
      {error ? (
        <div className="mb-4">
          <AlertBanner tone="error">{error}</AlertBanner>
        </div>
      ) : null}
      {success ? (
        <div className="mb-4">
          <AlertBanner tone="success">{success}</AlertBanner>
        </div>
      ) : null}

      <section className="ui-card mb-4 overflow-hidden">
        <div className="border-b border-brand-line px-4 py-3 sm:px-5">
          <h2 className="text-lg font-semibold text-brand-900">Transaction records</h2>
          <p className="text-sm text-brand-muted">
            Amounts and statuses below reflect the saved payment transaction records.
          </p>
        </div>
        <form
          method="get"
          className="grid gap-3 border-b border-brand-line bg-[#f7fbf4] p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_12rem_12rem_12rem_auto] lg:items-end"
        >
          <input type="hidden" name="period" value={period} />
          <label className="grid gap-1 text-sm font-medium text-brand-900">
            Payment status
            <select
              name="paymentStatus"
              defaultValue={paymentStatus}
              className="min-h-11 rounded-xl border border-brand-line bg-white px-3"
            >
              <option value="all">All statuses</option>
              {paymentStatuses.map((status) => (
                <option key={status} value={status}>
                  {pretty(status)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium text-brand-900">
            From date
            <input
              type="date"
              name="from"
              defaultValue={dateFrom}
              className="min-h-11 rounded-xl border border-brand-line bg-white px-3"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium text-brand-900">
            To date
            <input
              type="date"
              name="to"
              defaultValue={dateTo}
              className="min-h-11 rounded-xl border border-brand-line bg-white px-3"
            />
          </label>
          <span className="text-sm text-brand-muted lg:pb-3">
            {transactionRows.length} of {paymentsInRange.length} records
          </span>
          <button type="submit" className="btn btn-primary">
            Filter transactions
          </button>
        </form>
        {transactionRows.length ? (
          <PagedRows className="divide-y divide-brand-line">
            {transactionRows.map((payment) => {
              const order = payment.order
              const buyerName = order?.buyerName || store.users.get(order?.buyer)?.name || 'Buyer'
              return (
                <li key={payment.id} className="px-4 py-4 sm:px-5">
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
                    <div className="min-w-0">
                      <h3 className="break-all font-semibold text-brand-900">
                        Transaction {payment.id}
                      </h3>
                      <p className="text-sm text-brand-muted">
                        Order {order?.reference || payment.orderId} · {buyerName}
                      </p>
                      <p className="mt-1 text-sm text-brand-muted">
                        {pretty(payment.method)} ·{' '}
                        {payment.createdAt
                          ? new Date(payment.createdAt).toLocaleString('en-PH')
                          : 'Date unavailable'}
                      </p>
                    </div>
                    <StatusBadge status={pretty(payment.status || 'unknown')} />
                    <p className="text-lg font-bold text-brand-900">{peso(payment.amount)}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {order ? (
                      <a
                        href={`/admin/payments/${encodeURIComponent(payment.id)}/receipt`}
                        className="btn btn-secondary"
                      >
                        View transaction receipt
                      </a>
                    ) : (
                      <span className="py-2 text-sm text-brand-muted">
                        Order unavailable; no associated receipt
                      </span>
                    )}
                    <details className="w-full">
                      <summary className="w-fit cursor-pointer py-2 text-sm font-semibold text-brand-700">
                        View transaction details
                      </summary>
                      <dl className="mt-2 grid gap-3 rounded-xl bg-[#f7fbf4] p-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                        <TransactionDetail label="Transaction number" value={payment.id} />
                        <TransactionDetail
                          label="Order reference"
                          value={order?.reference || payment.orderId}
                        />
                        <TransactionDetail label="Buyer" value={buyerName} />
                        <TransactionDetail label="Payment method" value={pretty(payment.method)} />
                        <TransactionDetail label="Provider" value={pretty(payment.provider)} />
                        <TransactionDetail
                          label="Provider reference"
                          value={payment.providerReference || 'Not recorded'}
                        />
                        <TransactionDetail
                          label="Recorded transaction amount"
                          value={peso(payment.amount)}
                        />
                        <TransactionDetail
                          label="Payment status"
                          value={pretty(payment.status || 'unknown')}
                        />
                        <TransactionDetail
                          label="Order payment status"
                          value={pretty(order?.paymentStatus || 'unknown')}
                        />
                      </dl>
                    </details>
                  </div>
                </li>
              )
            })}
          </PagedRows>
        ) : (
          <p className="p-6 text-sm text-brand-muted">
            No transaction records match these filters.
          </p>
        )}
      </section>

      <div className={workGridClass}>
        <WorkSection
          title="Platform commission ready to collect"
          description="Marketplace commission from completed seller orders awaiting collection."
          count={platformLedger.ready.length}
          empty={
            <p className="text-sm text-[#5c6f62]">
              No platform commission is waiting for collection.
            </p>
          }
        >
          <PagedRows>
            {platformLedger.ready.map((order) => (
              <li key={order.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-semibold text-[#142016]">{order.reference}</p>
                  <p className="text-[13px] text-[#5c6f62]">
                    {pretty(order.paymentMethod)} · {order.buyerName}
                  </p>
                  <p className="text-[13px] text-[#5c6f62]">
                    {(() => {
                      const source = store.orders.get(order.id)
                      const count = source ? itemCount(source) : 0
                      return `₱${rate} × ${count} item${count === 1 ? '' : 's'} · taken from ${source ? sellerNames(source) : 'the seller'}'s payout`
                    })()}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <p className="text-sm font-semibold">{peso(order.amount)}</p>
                  <StatusBadge status="Ready" />
                  <form action={payPlatformCommissionAction}>
                    <input type="hidden" name="orderId" value={order.id} />
                    <SubmitButton className="btn btn-dark" pendingLabel="Saving…">
                      Mark collected
                    </SubmitButton>
                  </form>
                </div>
              </li>
            ))}
          </PagedRows>
        </WorkSection>

        <WorkSection
          title="Platform commission collected"
          description="Marketplace commission already recorded as collected."
          count={platformLedger.paid.length}
          empty={
            <p className="text-sm text-[#5c6f62]">No platform commission has been collected.</p>
          }
        >
          <PagedRows>
            {platformLedger.paid.map((order) => (
              <li key={order.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-semibold text-[#142016]">{order.reference}</p>
                  <p className="text-[13px] text-[#5c6f62]">
                    {pretty(order.paymentMethod)} · {order.buyerName}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <p className="text-sm font-semibold">{peso(order.amount)}</p>
                  <StatusBadge status="Collected" />
                </div>
              </li>
            ))}
          </PagedRows>
        </WorkSection>

        <WorkSection
          title="Seller payments awaiting release"
          description="Orders completed by the buyer. Amounts are manually marked released only after buyer confirmation."
          count={store.orders ? [...store.orders.values()].filter((order) =>
            order.status === 'completed' && order.sellerPaymentStatus !== 'released'
          ).length : 0}
        >
          <PagedRows>
            {[...(store.orders?.values() || [])]
              .filter((order) => order.status === 'completed' && order.sellerPaymentStatus !== 'released')
              .map((order) => (
                <li key={order.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-[#142016]">{order.reference}</p>
                    <p className="text-[13px] text-[#5c6f62]">
                      Pay <strong className="text-[#142016]">{sellerNames(order)}</strong> · {pretty(order.fulfillment)} · {pretty(order.paymentMethod)}
                    </p>
                    <p className="text-[13px] text-[#5c6f62]">
                      Products {peso(order.subtotal || 0)} − commission {peso(order.platformFee || 0)} = {peso(Math.max(0, Number(order.subtotal || 0) - Number(order.platformFee || 0)))}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <p className="text-sm font-semibold">
                      {peso(Math.max(0, Number(order.subtotal || 0) - Number(order.platformFee || 0)))}
                    </p>
                    <form action={paySellerAction}>
                      <input type="hidden" name="orderId" value={order.id} />
                      <SubmitButton className="btn btn-dark" pendingLabel="Saving…">Mark seller paid</SubmitButton>
                    </form>
                  </div>
                </li>
              ))}
          </PagedRows>
        </WorkSection>

        <WorkSection
          title="Courier commissions ready to pay"
          description="Finished deliveries where the separate ₱49 courier fee is awaiting payout."
          count={readyToPay.length}
          empty={<p className="text-sm text-[#5c6f62]">No commission is waiting for payout.</p>}
        >
          <PagedRows>
            {readyToPay.map((delivery) => (
              <li key={delivery.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-semibold text-[#142016]">
                    {delivery.order?.reference || delivery.orderId}
                  </p>
                  <p className="text-[13px] text-[#5c6f62]">
                    {pretty(delivery.order?.paymentMethod)} · {pretty(delivery.status)} ·{' '}
                    {delivery.courier?.name || 'Unassigned'}
                  </p>
                  <a
                    href={delivery.proofOfDelivery.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[13px] font-semibold text-brand-700 hover:underline"
                  >
                    View proof of delivery
                  </a>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <p className="text-sm font-semibold">{peso(delivery.commission)}</p>
                  <StatusBadge status={pretty(delivery.commissionStatus)} />
                  <form action={payCommissionAction}>
                    <input type="hidden" name="deliveryId" value={delivery.id} />
                    <SubmitButton className="btn btn-dark" pendingLabel="Saving…">
                      Mark paid
                    </SubmitButton>
                  </form>
                </div>
              </li>
            ))}
          </PagedRows>
        </WorkSection>

        <WorkSection
          title="Courier commissions paid"
          description="Courier payouts already marked paid."
          count={paidOut.length}
          empty={<p className="text-sm text-[#5c6f62]">No commission has been marked paid.</p>}
        >
          <PagedRows>
            {paidOut.map((delivery) => (
              <li key={delivery.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-semibold text-[#142016]">
                    {delivery.order?.reference || delivery.orderId}
                  </p>
                  <p className="text-[13px] text-[#5c6f62]">
                    {pretty(delivery.order?.paymentMethod)} ·{' '}
                    {delivery.courier?.name || 'Unassigned'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <p className="text-sm font-semibold">{peso(delivery.commission)}</p>
                  <StatusBadge status={pretty(delivery.commissionStatus)} />
                </div>
              </li>
            ))}
          </PagedRows>
        </WorkSection>
      </div>
    </DashboardShell>
  )
}

function TransactionDetail({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-brand-muted">{label}</dt>
      <dd className="mt-1 break-words font-medium text-brand-900">{value}</dd>
    </div>
  )
}
