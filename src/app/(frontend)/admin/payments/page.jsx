import { payCommissionAction, payPlatformCommissionAction } from '@/app/(frontend)/admin/actions'
import { DashboardShell, peso, pretty } from '@/components/dashboard-shell'
import { PeriodFilter } from '@/components/period-filter'
import { AlertBanner, StatusBadge, WorkSection, workGridClass } from '@/components/dashboard-ui'
import { PagedRows } from '@/components/paged-rows'
import { inPeriod, periodLabel, readPeriod } from '@/lib/report-period'
import { listAssignments, platformCommissionLedger } from '@/server/admin'
import { requireAdmin } from '@/server/guards'
import { listPayments } from '@/server/payments'
import { readyStore } from '@/server/store'

export default async function AdminPaymentsPage({ searchParams }) {
  const user = await requireAdmin()

  const query = await searchParams
  const error = typeof query.error === 'string' ? query.error : ''
  const success = typeof query.success === 'string' ? query.success : ''
  const period = readPeriod(query.period)
  const [payments, deliveries, store] = await Promise.all([listPayments(), listAssignments(), readyStore()])
  const platformLedger = platformCommissionLedger(store)
  const paymentsInRange = payments.filter((payment) => inPeriod(payment.createdAt, period))
  const deliveriesInRange = deliveries.filter((delivery) => inPeriod(delivery.updatedAt || delivery.order?.createdAt, period))
  const readyToPay = deliveries.filter((delivery) => ['delivered', 'completed'].includes(delivery.status) && delivery.commissionStatus !== 'paid')
  const paidOut = deliveriesInRange.filter((delivery) => delivery.commissionStatus === 'paid')

  return (
    <DashboardShell
      user={user}
      title="Commission payouts"
      subtitle={`${periodLabel(period)} · buyer checkouts, platform commission, and courier payouts.`}
    >
      <div className="mb-4">
        <PeriodFilter period={period} pathname="/admin/payments" />
      </div>
      {error ? <div className="mb-4"><AlertBanner tone="error">{error}</AlertBanner></div> : null}
      {success ? <div className="mb-4"><AlertBanner tone="success">{success}</AlertBanner></div> : null}

      <div className={workGridClass}>
        <WorkSection
          title="Buyer payments"
          description="Recorded when a buyer checks out, including online payments."
          count={paymentsInRange.length}
          empty={<p className="text-sm text-[#5c6f62]">No buyer payments yet.</p>}
        >
          <PagedRows>
            {paymentsInRange.map((payment) => (
              <li key={payment.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-semibold text-[#142016]">{payment.order?.reference || 'Order'}</p>
                  <p className="text-[13px] text-[#5c6f62]">
                    {pretty(payment.method)} · {payment.provider}
                    {payment.providerReference ? ` · ${payment.providerReference}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <p className="text-sm font-semibold">{peso(payment.amount)}</p>
                  <StatusBadge status={pretty(payment.status)} />
                </div>
              </li>
            ))}
          </PagedRows>
        </WorkSection>

        <WorkSection
          title="Platform commission ready to collect"
          description="Marketplace commission from completed seller orders awaiting collection."
          count={platformLedger.ready.length}
          empty={<p className="text-sm text-[#5c6f62]">No platform commission is waiting for collection.</p>}
        >
          <PagedRows>
            {platformLedger.ready.map((order) => (
              <li key={order.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-semibold text-[#142016]">{order.reference}</p>
                  <p className="text-[13px] text-[#5c6f62]">{pretty(order.paymentMethod)} · {order.buyerName}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <p className="text-sm font-semibold">{peso(order.amount)}</p>
                  <StatusBadge status="Ready" />
                  <form action={payPlatformCommissionAction}>
                    <input type="hidden" name="orderId" value={order.id} />
                    <button type="submit" className="btn btn-dark">Mark collected</button>
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
          empty={<p className="text-sm text-[#5c6f62]">No platform commission has been collected.</p>}
        >
          <PagedRows>
            {platformLedger.paid.map((order) => (
              <li key={order.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-semibold text-[#142016]">{order.reference}</p>
                  <p className="text-[13px] text-[#5c6f62]">{pretty(order.paymentMethod)} · {order.buyerName}</p>
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
          title="Courier commissions ready to pay"
          description="Finished deliveries where the separate ₱49 courier fee is awaiting payout."
          count={readyToPay.length}
          empty={<p className="text-sm text-[#5c6f62]">No commission is waiting for payout.</p>}
        >
          <PagedRows>
            {readyToPay.map((delivery) => (
              <li key={delivery.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-semibold text-[#142016]">{delivery.order?.reference || delivery.orderId}</p>
                  <p className="text-[13px] text-[#5c6f62]">
                    {pretty(delivery.order?.paymentMethod)} · {pretty(delivery.status)} · {delivery.courier?.name || 'Unassigned'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <p className="text-sm font-semibold">{peso(delivery.commission)}</p>
                  <StatusBadge status={pretty(delivery.commissionStatus)} />
                  <form action={payCommissionAction}>
                    <input type="hidden" name="deliveryId" value={delivery.id} />
                    <button type="submit" className="btn btn-dark">
                      Mark paid
                    </button>
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
                  <p className="font-semibold text-[#142016]">{delivery.order?.reference || delivery.orderId}</p>
                  <p className="text-[13px] text-[#5c6f62]">
                    {pretty(delivery.order?.paymentMethod)} · {delivery.courier?.name || 'Unassigned'}
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
