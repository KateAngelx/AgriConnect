import { haversineKm, travelMinutesBetween } from '@/lib/delivery-eta'
import { isValidPin, parseCoord } from '@/lib/geo'
import { listDeliveryWorkForUser } from '@/server/delivery-assignments'
import { readyStore } from '@/server/store'

function distanceToJob(courierLat, courierLng, order) {
  const plat = parseCoord(order?.sellerPickup?.pickupLat)
  const plng = parseCoord(order?.sellerPickup?.pickupLng)
  const dlat = parseCoord(order?.deliveryLat)
  const dlng = parseCoord(order?.deliveryLng)
  const clat = parseCoord(courierLat)
  const clng = parseCoord(courierLng)
  if (!isValidPin(clat, clng)) return { kmToPickup: null, kmPickupToDrop: null }
  const kmToPickup = isValidPin(plat, plng) ? haversineKm(clat, clng, plat, plng) : null
  const kmPickupToDrop =
    isValidPin(plat, plng) && isValidPin(dlat, dlng) ? haversineKm(plat, plng, dlat, dlng) : null
  const travelMin =
    isValidPin(plat, plng) && isValidPin(dlat, dlng)
      ? travelMinutesBetween(plat, plng, dlat, dlng)
      : null
  return {
    kmToPickup: kmToPickup !== null ? Number(kmToPickup.toFixed(2)) : null,
    kmPickupToDrop: kmPickupToDrop !== null ? Number(kmPickupToDrop.toFixed(2)) : null,
    travelMinutesEstimate: travelMin,
  }
}

export async function deliveryCourierFacts(user, courierLat, courierLng) {
  const store = await readyStore()
  const work = await listDeliveryWorkForUser(user)
  const jobs = work.map((assignment) => {
    const order = store.orders.get(assignment.orderId)
    const dist = distanceToJob(courierLat, courierLng, order)
    const sortKey =
      dist.kmToPickup !== null ? dist.kmToPickup : dist.kmPickupToDrop !== null ? dist.kmPickupToDrop + 50 : 9999
    return {
      deliveryId: assignment.id,
      reference: assignment.reference,
      status: assignment.status,
      privacy: assignment.privacy,
      commission: assignment.commission,
      pickupArea: assignment.pickupArea,
      deliveryAreaGeneral: assignment.deliveryAreaGeneral,
      estimatedArrivalAt: order?.estimatedArrivalAt || null,
      ...dist,
      sortKey,
      isMine: assignment.isMine,
    }
  })

  jobs.sort((a, b) => a.sortKey - b.sortKey)

  return {
    generatedAt: new Date().toISOString(),
    courierServiceArea: user.serviceArea || '',
    locationUsed: isValidPin(parseCoord(courierLat), parseCoord(courierLng)),
    prioritizedJobs: jobs,
    openCount: jobs.filter((j) => j.status === 'open').length,
    activeCount: jobs.filter((j) => j.isMine && !['delivered', 'cancelled'].includes(j.status)).length,
  }
}

export function formatDeliveryPriorityAnswer(facts) {
  const open = facts.prioritizedJobs.filter((j) => j.status === 'open')
  if (!open.length) {
    return 'No open delivery jobs right now. Check back when sellers mark orders ready for dispatch.'
  }
  const lines = open.slice(0, 6).map((job, index) => {
    const dist =
      job.kmToPickup !== null
        ? `${job.kmToPickup} km to pickup`
        : job.kmPickupToDrop !== null
          ? `${job.kmPickupToDrop} km route (pickup→drop)`
          : 'distance unknown — share location in the assistant'
    const eta = job.estimatedArrivalAt
      ? ` · buyer ETA ${new Date(job.estimatedArrivalAt).toLocaleString()}`
      : ''
    return `${index + 1}. ${job.reference} — ${dist} · ${job.pickupArea} → ${job.deliveryAreaGeneral}${eta} · commission ₱${job.commission}`
  })
  const intro = facts.locationUsed
    ? 'Jobs sorted nearest to your shared location (pickup pin first):'
    : 'Jobs sorted by route data when available. Tap “Use my location” for better priority:'
  return `${intro}\n\n${lines.join('\n')}`
}
