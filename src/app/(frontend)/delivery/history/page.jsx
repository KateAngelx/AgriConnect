import Link from 'next/link'
import { DashboardShell, peso } from '@/components/dashboard-shell'
import { PeriodFilter } from '@/components/period-filter'
import { StatusBadge, WorkSection, workStackClass } from '@/components/dashboard-ui'
import { Modal } from '@/components/modal'
import { PagedRows } from '@/components/paged-rows'
import { DashboardIcon } from '@/components/dashboard-icons'
import { deliveryStatusLabel } from '@/lib/dashboard-format'
import { inPeriod, periodLabel, readPeriod } from '@/lib/report-period'
import { requireApprovedDelivery } from '@/server/guards'
import { listDeliveryHistory } from '@/server/delivery'

export default async function DeliveryHistoryPage({ searchParams }) {
  const user = await requireApprovedDelivery()
  const query = await searchParams
  const period = readPeriod(query.period)
  const history = (await listDeliveryHistory(user)).filter((item) =>
    inPeriod(item.deliveryDate, period),
  )
  const deliveryId = typeof query.delivery === 'string' ? query.delivery : ''
  const selected = history.find((item) => item.id === deliveryId) || null

  return (
    <DashboardShell
      user={user}
      title="Delivery history"
      subtitle={`${periodLabel(period)} · completed, cancelled, and failed assignments.`}
    >
      <div className="mb-6">
        <PeriodFilter period={period} pathname="/delivery/history" />
      </div>
      <div className={workStackClass}>
        <WorkSection
          title="Your assignments"
          description="Completed, cancelled, and failed assignments with their dates and earnings."
          count={history.length}
          href="/delivery/commissions"
          linkLabel="Open commissions"
          empty={
            <p className="text-sm text-[#5c6f62]">
              Finished or closed assignments will appear here.
            </p>
          }
        >
          <PagedRows>
            {history.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-semibold text-[#142016]">
                    {item.order?.reference || 'Delivery'}
                  </p>
                  <p className="text-[13px] text-[#5c6f62]">
                    {item.itemCount} item{item.itemCount === 1 ? '' : 's'} ·{' '}
                    {item.deliveryAreaGeneral}
                  </p>
                  <p className="text-[13px] text-[#5c6f62]">
                    {item.deliveryDate
                      ? new Date(item.deliveryDate).toLocaleString('en-PH')
                      : 'Date unavailable'}
                    {' · Earnings '}
                    {peso(item.earnedCommission)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <StatusBadge status={deliveryStatusLabel(item.status)} />
                  <Link
                    href={`/delivery/history?period=${encodeURIComponent(period)}&delivery=${encodeURIComponent(item.id)}`}
                    className="grid size-9 place-items-center rounded-lg border border-[#d5e4d4] text-[#2e7d32] hover:bg-[#eef8e8]"
                    aria-label={`View details for ${item.order?.reference || item.orderId}`}
                    title="View details"
                  >
                    <DashboardIcon name="eye" className="size-4" />
                  </Link>
                </div>
              </li>
            ))}
          </PagedRows>
        </WorkSection>
      </div>
      {deliveryId ? (
        <Modal
          key={deliveryId}
          title={selected?.order?.reference || 'Delivery'}
          subtitle={
            selected
              ? `${deliveryStatusLabel(selected.status)} · ${selected.deliveryDate ? new Date(selected.deliveryDate).toLocaleString('en-PH') : 'Date unavailable'}`
              : 'Seller pickup to buyer drop-off.'
          }
          closeHref={`/delivery/history?period=${encodeURIComponent(period)}`}
          size="xl"
        >
          {selected ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-[#d5e4d4] bg-[#fbfdf9] p-4 text-sm text-[#142016]">
                <p>
                  <strong>Status:</strong> {deliveryStatusLabel(selected.status)}
                </p>
                <p className="mt-1">
                  <strong>Pickup:</strong> {selected.pickupLocations || selected.pickupArea}
                </p>
                <p className="mt-1">
                  <strong>Destination area:</strong> {selected.deliveryAreaGeneral}
                </p>
                <p className="mt-1">
                  <strong>Earnings:</strong> {peso(selected.earnedCommission)}
                </p>
                {selected.order?.items?.length ? (
                  <p className="mt-2">
                    <strong>Items:</strong>{' '}
                    {selected.order.items
                      .map((item) => `${item.quantity} × ${item.name}`)
                      .join(', ')}
                  </p>
                ) : null}
              </div>
              {selected.status === 'cancelled' || selected.status === 'delivery-failed' ? (
                <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
                  This assignment did not result in a completed delivery, so no delivery commission
                  was earned.
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-[#5c6f62]">This delivery is not in the selected period.</p>
          )}
        </Modal>
      ) : null}
    </DashboardShell>
  )
}
