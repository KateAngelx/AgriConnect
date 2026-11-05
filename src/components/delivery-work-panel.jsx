import { collectDeliveryAction, trackAction } from '@/app/(frontend)/delivery/actions'
import Link from 'next/link'
import { OverviewPanel } from '@/components/dashboard-overview-ui'
import { DarkButton, FieldInput, StatusBadge } from '@/components/dashboard-ui'
import { LocationRouteMap } from '@/components/location-route-map'
import { deliveryStatusLabel, peso } from '@/lib/dashboard-format'
import { DashboardIcon } from '@/components/dashboard-icons'
import { ConfirmButton } from '@/components/confirm-button'
import { formatEstimatedArrival } from '@/lib/delivery-eta'
import { PagedRows } from '@/components/paged-rows'
import { CourierLocationSharing } from '@/components/courier-location-sharing'

const nextLabel = {
  open: 'Accept assignment',
  accepted: 'Mark courier picked up',
  'picked-up': 'Mark out for delivery',
  'in-transit': 'Mark delivered',
}

const progressSteps = [
  { status: 'accepted', label: 'Assigned' },
  { status: 'picked-up', label: 'Courier picked up' },
  { status: 'in-transit', label: 'Out for delivery' },
  { status: 'delivered', label: 'Delivered' },
]

export function DeliveryWorkPanel({ work, detailsHref = '/delivery/deliveries', bare = false, emptyMessage = 'Open jobs in your service area will appear here.' }) {
  const body = work.length ? (
    <PagedRows>
      {work.map((assignment) => (
        <li key={assignment.id} className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="font-semibold text-[#142016]">{assignment.reference || 'Assignment'}</p>
            <p className="text-[13px] text-[#5c6f62]">
              {assignment.privacy === 'preview'
                ? `Pickup: ${assignment.pickupArea}`
                : `${assignment.buyerName || 'Buyer'} · ${peso(assignment.commission)}`}
            </p>
            {assignment.privacy === 'preview' ? (
              <p className="mt-0.5 text-[13px] text-[#5c6f62]">
                Deliver: {assignment.deliveryAreaGeneral} · {peso(assignment.commission)}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <StatusBadge status={deliveryStatusLabel(assignment.status)} />
            <Link href={`${detailsHref}?job=${encodeURIComponent(assignment.id)}`} className="grid size-9 place-items-center rounded-lg border border-[#d5e4d4] text-[#2e7d32] hover:bg-[#eef8e8]" aria-label={`View details for ${assignment.reference || 'assignment'}`} title="View details">
              <DashboardIcon name="eye" className="size-4" />
            </Link>
          </div>
        </li>
      ))}
    </PagedRows>
  ) : (
    <p className="text-sm text-[#5c6f62]">{emptyMessage}</p>
  )
  if (bare) return body
  return <OverviewPanel title="Manage assignments">{body}</OverviewPanel>
}

export function DeliveryAssignmentDetail({ assignment }) {
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {assignment.privacy === 'preview' ? (
            <p className="text-sm text-[#65766d]">
              Pickup area: {assignment.pickupArea} · Delivery area: {assignment.deliveryAreaGeneral} · Commission {peso(assignment.commission)}
            </p>
          ) : (
            <p className="text-sm text-[#65766d]">
              Deliver to: {assignment.deliveryAddress} · Contact {assignment.contactNumber || 'on file'} · Commission {peso(assignment.commission)}
            </p>
          )}
          {assignment.privacy === 'preview' ? (
            <p className="mt-2 text-xs text-[#65766d]">Full pickup and delivery details appear after you accept this assignment.</p>
          ) : (
            <p className="mt-2 text-xs text-[#65766d]">
              Pickup: {assignment.pickupLocations} · Buyer: {assignment.buyerName || 'Buyer'}
              {assignment.estimatedArrivalAt ? <> · ETA {formatEstimatedArrival(assignment.estimatedArrivalAt)}</> : null}
            </p>
          )}
          {assignment.privacy === 'full' && assignment.instructions ? (
            <p className="mt-2 text-sm text-[#65766d]"><strong>Delivery instructions:</strong> {assignment.instructions}</p>
          ) : null}
        </div>
        <StatusBadge status={deliveryStatusLabel(assignment.status)} />
      </div>
      <DeliveryProgress status={assignment.status} updates={assignment.updates} />
      <CourierLocationSharing
        deliveryId={assignment.id}
        active={assignment.isMine && ['accepted', 'picked-up', 'in-transit'].includes(assignment.status)}
      />
      {(assignment.privacy === 'full' || (assignment.pickupLat && assignment.deliveryLat)) ? (
        <div className="mt-4">
          <LocationRouteMap
            pickupLat={assignment.pickupLat}
            pickupLng={assignment.pickupLng}
            deliveryLat={assignment.deliveryLat}
            deliveryLng={assignment.deliveryLng}
            height={220}
          />
        </div>
      ) : null}
      {nextLabel[assignment.status] && (assignment.status === 'open' || assignment.isMine) ? (
        <form action={trackAction} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input type="hidden" name="deliveryId" value={assignment.id} />
          <FieldInput name="note" placeholder="Tracking note (optional)" className="flex-1" />
          <ConfirmButton type="submit" message={`Confirm: ${nextLabel[assignment.status]}?`} className="btn btn-dark">
            {nextLabel[assignment.status]}
          </ConfirmButton>
        </form>
      ) : null}
      {assignment.isMine &&
      assignment.order?.canCollectCash ? (
        <form action={collectDeliveryAction} className="mt-3">
          <input type="hidden" name="orderId" value={assignment.orderId} />
          <DarkButton type="submit">Record cash collected</DarkButton>
        </form>
      ) : null}
    </div>
  )
}

function DeliveryProgress({ status, updates = [] }) {
  const currentIndex = progressSteps.findIndex((step) => step.status === status)
  const completedStatuses = new Set(updates.map((update) => update.status))

  return (
    <div className="mt-5 rounded-xl border border-[#d5e4d4] bg-[#fbfdf9] p-4">
      <p className="text-sm font-bold text-[#142016]">Delivery progress</p>
      <ol className="mt-3 space-y-3">
        {progressSteps.map((step, index) => {
          const complete = completedStatuses.has(step.status) || index < currentIndex
          const active = step.status === status || (status === 'open' && index === 0)
          return (
            <li key={step.status} className="flex items-start gap-3">
              <span className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold ${
                complete ? 'bg-[#2e7d32] text-white' : active ? 'border-2 border-[#2e7d32] bg-white text-[#2e7d32]' : 'bg-[#e7ebe6] text-[#718076]'
              }`}>
                {complete ? '✓' : index + 1}
              </span>
              <div>
                <p className={`text-sm font-semibold ${complete || active ? 'text-[#142016]' : 'text-[#718076]'}`}>{step.label}</p>
                {complete && updates.find((update) => update.status === step.status)?.note ? (
                  <p className="mt-0.5 text-xs text-[#65766d]">{updates.find((update) => update.status === step.status).note}</p>
                ) : null}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
