import { DashboardShell, peso, pretty } from '@/components/dashboard-shell'
import { PeriodFilter } from '@/components/period-filter'
import { ListRow, StatusBadge, WorkSection } from '@/components/dashboard-ui'
import { LocationRouteMap } from '@/components/location-route-map'
import { inPeriod, periodLabel, readPeriod } from '@/lib/report-period'
import { requireApprovedDelivery } from '@/server/guards'
import { listCommissions } from '@/server/delivery'

export default async function DeliveryHistoryPage({ searchParams }) {
  const user = await requireApprovedDelivery()
  const query = await searchParams
  const period = readPeriod(query.period)
  const history = (await listCommissions(user)).filter((item) => inPeriod(item.updatedAt, period))

  return (
    <DashboardShell
      user={user}
      title="Delivered"
      subtitle={`${periodLabel(period)} · finished deliveries, from the seller pickup to the buyer drop-off.`}
    >
      <div className="mb-6">
        <PeriodFilter period={period} pathname="/delivery/history" />
      </div>
      <WorkSection
        title="Delivered"
        description="Each row is a delivery you already completed."
        count={history.length}
        href="/delivery/commissions"
        linkLabel="Open commissions"
        empty={<p className="text-sm text-[#5c6f62]">Finished jobs will appear here.</p>}
      >
        <ul className="space-y-3">
          {history.map((item) => (
            <li key={item.id} className="space-y-3">
              <ListRow
                badge={<StatusBadge status={pretty(item.status)} />}
                title={item.order?.reference || 'Delivery'}
                meta={`Buyer drop-off · commission ${peso(item.commission)} · payout ${pretty(item.commissionStatus)}`}
              />
              <LocationRouteMap
                pickupLat={item.pickupLat}
                pickupLng={item.pickupLng}
                deliveryLat={item.deliveryLat}
                deliveryLng={item.deliveryLng}
                height={180}
              />
            </li>
          ))}
        </ul>
      </WorkSection>
    </DashboardShell>
  )
}
