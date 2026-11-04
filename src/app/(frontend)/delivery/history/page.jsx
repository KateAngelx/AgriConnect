import { DashboardShell, peso, pretty } from '@/components/dashboard-shell'
import { PeriodFilter } from '@/components/period-filter'
import { StatusBadge, WorkSection, workStackClass } from '@/components/dashboard-ui'
import { LocationRouteMap } from '@/components/location-route-map'
import { Modal } from '@/components/modal'
import { PagedRows } from '@/components/paged-rows'
import { inPeriod, periodLabel, readPeriod } from '@/lib/report-period'
import { requireApprovedDelivery } from '@/server/guards'
import { listCommissions } from '@/server/delivery'

export default async function DeliveryHistoryPage({ searchParams }) {
  const user = await requireApprovedDelivery()
  const query = await searchParams
  const period = readPeriod(query.period)
  const history = (await listCommissions(user)).filter((item) => inPeriod(item.updatedAt, period))
  const deliveryId = typeof query.delivery === 'string' ? query.delivery : ''
  const selected = history.find((item) => item.id === deliveryId) || null

  return (
    <DashboardShell
      user={user}
      title="Delivered"
      subtitle={`${periodLabel(period)} · finished deliveries, from the seller pickup to the buyer drop-off.`}
    >
      <div className="mb-6">
        <PeriodFilter period={period} pathname="/delivery/history" />
      </div>
      <div className={workStackClass}>
      <WorkSection
        title="Delivered"
        description="Each row is a delivery you already completed."
        count={history.length}
        href="/delivery/commissions"
        linkLabel="Open commissions"
        empty={<p className="text-sm text-[#5c6f62]">Finished jobs will appear here.</p>}
      >
        <PagedRows>
          {history.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="font-semibold text-[#142016]">{item.order?.reference || 'Delivery'}</p>
                <p className="text-[13px] text-[#5c6f62]">
                  Commission {peso(item.commission)} · payout {pretty(item.commissionStatus)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <StatusBadge status={pretty(item.status)} />
                <a href={`/delivery/history?period=${encodeURIComponent(period)}&delivery=${encodeURIComponent(item.id)}`} className="text-sm font-bold text-[#4f8d3b]">
                  Details
                </a>
              </div>
            </li>
          ))}
        </PagedRows>
      </WorkSection>
      </div>
      {deliveryId ? (
        <Modal
          title={selected?.order?.reference || 'Delivery'}
          subtitle="Seller pickup to buyer drop-off."
          closeHref={`/delivery/history?period=${encodeURIComponent(period)}`}
          size="xl"
        >
          {selected ? (
            <LocationRouteMap
              pickupLat={selected.pickupLat}
              pickupLng={selected.pickupLng}
              deliveryLat={selected.deliveryLat}
              deliveryLng={selected.deliveryLng}
              height={280}
            />
          ) : (
            <p className="text-sm text-[#5c6f62]">This delivery is not in the selected period.</p>
          )}
        </Modal>
      ) : null}
    </DashboardShell>
  )
}
