import { isValidPin, parseCoord } from '@/lib/geo'

const AVG_SPEED_KMH = 28
const PREP_MINUTES = 25
const HANDOFF_MINUTES = 10

export function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180
  const a1 = toRad(lat1)
  const a2 = toRad(lat2)
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(a1) * Math.cos(a2) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

export function travelMinutesBetween(lat1, lng1, lat2, lng2) {
  if (!isValidPin(lat1, lng1) || !isValidPin(lat2, lng2)) return null
  const km = haversineKm(lat1, lng1, lat2, lng2)
  return Math.max(12, Math.round((km / AVG_SPEED_KMH) * 60 + HANDOFF_MINUTES))
}

export function computeDeliveryEtaIso({ pickupLat, pickupLng, deliveryLat, deliveryLng, fromDate = new Date() }) {
  const plat = parseCoord(pickupLat)
  const plng = parseCoord(pickupLng)
  const dlat = parseCoord(deliveryLat)
  const dlng = parseCoord(deliveryLng)
  const travel = travelMinutesBetween(plat, plng, dlat, dlng)
  if (travel === null) return null
  const totalMinutes = PREP_MINUTES + travel
  return new Date(fromDate.getTime() + totalMinutes * 60_000).toISOString()
}

/** Shorter window once courier is en route. */
export function refreshDeliveryEtaIso(order, deliveryStatus) {
  if (order.fulfillment !== 'delivery') return order.estimatedArrivalAt || null
  const pickup = order.sellerPickup
  const plat = parseCoord(pickup?.pickupLat)
  const plng = parseCoord(pickup?.pickupLng)
  const dlat = parseCoord(order.deliveryLat)
  const dlng = parseCoord(order.deliveryLng)
  const travel = travelMinutesBetween(plat, plng, dlat, dlng)
  if (travel === null) return order.estimatedArrivalAt || null
  const now = new Date()
  if (deliveryStatus === 'delivered' || order.status === 'delivered' || order.status === 'completed') {
    return order.estimatedArrivalAt || now.toISOString()
  }
  if (deliveryStatus === 'in-transit' || order.status === 'out-for-delivery') {
    return new Date(now.getTime() + Math.max(8, Math.round(travel * 0.55)) * 60_000).toISOString()
  }
  if (deliveryStatus === 'picked-up' || order.status === 'courier-picked-up') {
    return new Date(now.getTime() + Math.max(10, Math.round(travel * 0.75)) * 60_000).toISOString()
  }
  if (deliveryStatus === 'accepted' || order.status === 'delivery-assigned') {
    return new Date(now.getTime() + (PREP_MINUTES + travel) * 60_000).toISOString()
  }
  return (
    order.estimatedArrivalAt ||
    computeDeliveryEtaIso({
      pickupLat: plat,
      pickupLng: plng,
      deliveryLat: dlat,
      deliveryLng: dlng,
      fromDate: now,
    })
  )
}

export function formatEstimatedArrival(iso) {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function etaMinutesFromNow(iso) {
  if (!iso) return null
  const diff = new Date(iso).getTime() - Date.now()
  if (diff <= 0) return 0
  return Math.ceil(diff / 60_000)
}
