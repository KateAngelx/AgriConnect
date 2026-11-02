import { payCommissionAction } from '@/app/(frontend)/admin/actions'
import { DashboardShell, peso, pretty } from '@/components/dashboard-shell'
import { PeriodFilter } from '@/components/period-filter'
import { AlertBanner, ListRow, StatusBadge, WorkSection } from '@/components/dashboard-ui'
import { inPeriod, periodLabel, readPeriod } from '@/lib/report-period'
import { listAssignments } from '@/server/admin'
import { requireAdmin } from '@/server/guards'
import { listPayments } from '@/server/payments'

export default async function AdminPaymentsPage({ searchParams }) {
  const user = await requireAdmin()

  const query = await searchParams
  const error = typeof query.error === 'string' ? query.error : ''
  const success = typeof query.success === 'string' ? query.success : ''
  const period = readPeriod(query.period)
  const [payments, deliveries] = await Promise.all([listPayments(), listAssignments()])
  const paymentsInRange = payments.filter((payment) => inPeriod(payment.createdAt, period))
  const deliveriesInRange = deliveries.filter((delivery) => inPeriod(delivery.updatedAt || delivery.order?.createdAt, period))
  const readyToPay = deliveries.filter((delivery) => delivery.status === 'delivered' && delivery.commissionStatus !== 'paid')
  const paidOut = deliveriesInRange.filter((delivery) => delivery.commissionStatus === 'paid')
  const buyerPayments = paymentsInRange

  return (
    <DashboardShell
      user={user}
      title="Commission payouts"
      subtitle={`${periodLabel(period)} · buyer payments, and courier commissions still waiting to be paid.`}
    >
      <div className="mb-6">
        <PeriodFilter period={period} pathname="/admin/payments" />
      </div>
      {error ? <div className="mb-6"><AlertBanner tone="error">{error}</AlertBanner></div> : null}
      {success ? <div className="mb-6"><AlertBanner tone="success">{success}</AlertBanner></div> : null}

      <div className="space-y-8">
        <WorkSection
          title="Buyer payments"
          description="Money recorded when a buyer checks out."
          count={buyerPayments.length}
          empty={<p className="text-sm text-[#5c6f62]">No buyer payments yet.</p>}
        >
          <ul className="space-y-3">
            {buyerPayments.map((payment) => (
              <ListRow
                key={payment.id}
                badge={<StatusBadge status={pretty(payment.status)} />}
                title={payment.order?.reference || 'Order'}
                meta={`${pretty(payment.method)} · ${payment.provider}${payment.providerReference ? ` · Ref ${payment.providerReference}` : ''}`}
                amount={peso(payment.amount)}
              />
            ))}
          </ul>
        </WorkSection>

        <WorkSection
          title="Commissions ready to pay"
          description="Every delivered job that is still unpaid. This queue stays visible in every period."
          count={readyToPay.length}
          empty={<p className="text-sm text-[#5c6f62]">No commission is waiting for payout.</p>}
        >
          <ul className="space-y-3">
            {readyToPay.map((delivery) => (
              <ListRow
                key={delivery.id}
                title={delivery.order?.reference || delivery.orderId}
                meta={`${pretty(delivery.status)} · ${delivery.courier?.name || 'Unassigned'}`}
                badge={<StatusBadge status={pretty(delivery.commissionStatus)} />}
                amount={peso(delivery.commission)}
                actions={
                  <form action={payCommissionAction}>
                    <input type="hidden" name="deliveryId" value={delivery.id} />
                    <button type="submit" className="btn btn-dark">
                      Mark commission paid
                    </button>
                  </form>
                }
              />
            ))}
          </ul>
        </WorkSection>

        <WorkSection
          title="Commissions paid"
          description="Payouts you have already marked paid."
          count={paidOut.length}
          empty={<p className="text-sm text-[#5c6f62]">No commission has been marked paid.</p>}
        >
          <ul className="space-y-3">
            {paidOut.map((delivery) => (
              <ListRow
                key={delivery.id}
                title={delivery.order?.reference || delivery.orderId}
                meta={`${pretty(delivery.status)} · ${delivery.courier?.name || 'Unassigned'}`}
                badge={<StatusBadge status={pretty(delivery.commissionStatus)} />}
                amount={peso(delivery.commission)}
              />
            ))}
          </ul>
        </WorkSection>
      </div>
    </DashboardShell>
  )
}
