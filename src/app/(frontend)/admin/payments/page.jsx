import { payCommissionAction } from '@/app/(frontend)/admin/actions'
import { DashboardShell, peso, pretty } from '@/components/dashboard-shell'
import { AlertBanner, DashboardPanel, EmptyState, ListRow, StatusBadge } from '@/components/dashboard-ui'
import { listAssignments } from '@/server/admin'
import { requireAdmin } from '@/server/guards'
import { listPayments } from '@/server/payments'

export default async function AdminPaymentsPage({ searchParams }) {
  const user = await requireAdmin()

  const query = await searchParams
  const error = typeof query.error === 'string' ? query.error : ''
  const success = typeof query.success === 'string' ? query.success : ''
  const [payments, deliveries] = await Promise.all([listPayments(), listAssignments()])
  const pendingPayouts = deliveries.filter((delivery) => delivery.status === 'delivered' && delivery.commissionStatus !== 'paid')
  const paidPayouts = deliveries.filter((delivery) => delivery.commissionStatus === 'paid')

  return (
    <DashboardShell user={user} title="Payments and commissions" subtitle="Review transactions and mark courier payouts.">
      {error ? <div className="mb-6"><AlertBanner tone="error">{error}</AlertBanner></div> : null}
      {success ? <div className="mb-6"><AlertBanner tone="success">{success}</AlertBanner></div> : null}

      <section className="mb-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-[#173c2c]/10 bg-white p-5">
          <p className="text-sm text-[#65766d]">Waiting for payout</p>
          <p className="mt-1 text-2xl font-bold text-[#142016]">{peso(pendingPayouts.reduce((sum, delivery) => sum + delivery.commission, 0))}</p>
        </div>
        <div className="rounded-2xl border border-[#173c2c]/10 bg-white p-5">
          <p className="text-sm text-[#65766d]">Paid commissions</p>
          <p className="mt-1 text-2xl font-bold text-[#142016]">{peso(paidPayouts.reduce((sum, delivery) => sum + delivery.commission, 0))}</p>
        </div>
      </section>

      <DashboardPanel title="Marketplace transactions" description="Buyer payments recorded on orders.">
        {payments.length ? (
          <ul className="space-y-3">
            {payments.map((payment) => (
              <ListRow
                key={payment.id}
                badge={<StatusBadge status={pretty(payment.status)} />}
                title={payment.order?.reference || 'Order'}
                meta={`${pretty(payment.method)} · ${payment.provider}${payment.providerReference ? ` · Ref ${payment.providerReference}` : ''}`}
                amount={peso(payment.amount)}
              />
            ))}
          </ul>
        ) : (
          <EmptyState title="No payments yet">Transactions appear here after checkout.</EmptyState>
        )}
      </DashboardPanel>

      <div className="mt-8">
        <DashboardPanel title="Courier commissions" description="Mark payouts after delivery is complete.">
          {deliveries.length ? (
            <ul className="space-y-3">
              {deliveries.map((delivery) => (
                <ListRow
                  key={delivery.id}
                  title={delivery.order?.reference || delivery.orderId}
                  meta={`${pretty(delivery.status)} · Courier ${delivery.courier?.name || 'Unassigned'}`}
                  badge={<StatusBadge status={pretty(delivery.commissionStatus)} />}
                  amount={peso(delivery.commission)}
                  actions={
                    delivery.status === 'delivered' && delivery.commissionStatus !== 'paid' ? (
                      <form action={payCommissionAction}>
                        <input type="hidden" name="deliveryId" value={delivery.id} />
                        <button
                          type="submit"
                          className="rounded-full bg-[#173c2c] px-5 py-2.5 text-sm font-bold text-white hover:opacity-90"
                        >
                          Mark commission paid
                        </button>
                      </form>
                    ) : null
                  }
                />
              ))}
            </ul>
          ) : (
            <EmptyState title="No deliveries yet">Assignments show up when buyers choose delivery.</EmptyState>
          )}
        </DashboardPanel>
      </div>
    </DashboardShell>
  )
}
