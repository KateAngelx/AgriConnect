import { collectDeliveryAction, trackAction } from '@/app/(frontend)/delivery/actions'
import { OverviewPanel } from '@/components/dashboard-overview-ui'
import { DarkButton, EmptyState, FieldInput, StatusBadge } from '@/components/dashboard-ui'
import { LocationRouteMap } from '@/components/location-route-map'
import { peso, pretty } from '@/lib/dashboard-format'
import { ConfirmButton } from '@/components/confirm-button'
import { formatEstimatedArrival } from '@/lib/delivery-eta'

const nextLabel = {
  open: 'Accept assignment',
  accepted: 'Mark picked up',
  'picked-up': 'Mark in transit',
  'in-transit': 'Mark delivered',
}

export function DeliveryWorkPanel({ work, userId }) {
  return (
    <OverviewPanel title="Manage assignments">
      {work.length ? (
        <ul className="space-y-4">
          {work.map((assignment) => (
            <li
              key={assignment.id}
              className="rounded-xl border border-[#173c2c]/10 bg-[#fafbfa] p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-[#142016]">{assignment.reference || 'Assignment'}</p>
                  {assignment.privacy === 'preview' ? (
                    <p className="mt-1 text-sm text-[#65766d]">
                      Pickup area: {assignment.pickupArea} · Delivery area: {assignment.deliveryAreaGeneral} ·
                      Commission {peso(assignment.commission)}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-[#65766d]">
                      Deliver to: {assignment.deliveryAddress} · Contact {assignment.contactNumber || 'on file'} ·
                      Commission {peso(assignment.commission)}
                    </p>
                  )}
                  {assignment.privacy === 'preview' ? (
                    <p className="mt-2 text-xs text-[#65766d]">
                      Full pickup and delivery details appear after you accept this assignment.
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-[#65766d]">
                      Pickup: {assignment.pickupLocations} · Buyer: {assignment.buyerName || 'Buyer'}
                      {assignment.estimatedArrivalAt ? (
                        <> · ETA {formatEstimatedArrival(assignment.estimatedArrivalAt)}</>
                      ) : null}
                    </p>
                  )}
                </div>
                <StatusBadge status={pretty(assignment.status)} />
              </div>
              {assignment.privacy === 'full' ? (
                <div className="mt-4">
                  <LocationRouteMap
                    pickupLat={assignment.pickupLat}
                    pickupLng={assignment.pickupLng}
                    deliveryLat={assignment.deliveryLat}
                    deliveryLng={assignment.deliveryLng}
                    height={200}
                  />
                </div>
              ) : null}
              {nextLabel[assignment.status] &&
              (assignment.status === 'open' || assignment.isMine) ? (
                <form action={trackAction} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <input type="hidden" name="deliveryId" value={assignment.id} />
                  <FieldInput name="note" placeholder="Tracking note (optional)" className="flex-1" />
                  <ConfirmButton
                    type="submit"
                    message={`Confirm: ${nextLabel[assignment.status]}?`}
                    className="rounded-full bg-[#173c2c] px-4 py-2.5 text-sm font-bold text-white"
                  >
                    {nextLabel[assignment.status]}
                  </ConfirmButton>
                </form>
              ) : null}
              {assignment.isMine &&
                assignment.order?.paymentMethod === 'cash-on-delivery' &&
                assignment.order?.paymentStatus !== 'paid' &&
                ['delivered', 'completed'].includes(assignment.order?.status) && (
                  <form action={collectDeliveryAction} className="mt-3">
                    <input type="hidden" name="orderId" value={assignment.orderId} />
                    <DarkButton type="submit">Record cash collected</DarkButton>
                  </form>
                )}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No assignments">Open jobs in your service area will appear here.</EmptyState>
      )}
    </OverviewPanel>
  )
}
