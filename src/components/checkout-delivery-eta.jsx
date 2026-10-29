'use client'

import { computeDeliveryEtaIso, formatEstimatedArrival, travelMinutesBetween } from '@/lib/delivery-eta'
import { parseCoord } from '@/lib/geo'

export function CheckoutDeliveryEta({ sellerGroups, deliveryLat, deliveryLng }) {
  const dlat = parseCoord(deliveryLat)
  const dlng = parseCoord(deliveryLng)
  if (dlat === null || dlng === null || !sellerGroups?.length) return null

  let maxTravel = 0
  for (const group of sellerGroups) {
    const travel = travelMinutesBetween(group.pickupLat, group.pickupLng, dlat, dlng)
    if (travel !== null) maxTravel = Math.max(maxTravel, travel)
  }
  if (!maxTravel) {
    return (
      <p className="rounded-xl bg-[#fff8ed] px-4 py-3 text-sm text-[#7a4b12]">
        Drop your delivery pin to see an estimated arrival time. Sellers need a pickup pin on their shop profile.
      </p>
    )
  }

  const farthest = sellerGroups.reduce((best, group) => {
    const travel = travelMinutesBetween(group.pickupLat, group.pickupLng, dlat, dlng) ?? 0
    return travel >= (best.travel ?? 0) ? { group, travel } : best
  }, { travel: 0, group: sellerGroups[0] })

  const iso = computeDeliveryEtaIso({
    pickupLat: farthest.group.pickupLat,
    pickupLng: farthest.group.pickupLng,
    deliveryLat: dlat,
    deliveryLng: dlng,
  })
  const label = formatEstimatedArrival(iso)

  return (
    <p className="rounded-xl bg-[#eef8e8] px-4 py-3 text-sm text-[#2d6b1f]">
      <strong className="font-bold">Estimated arrival:</strong> about {maxTravel + 25} minutes from order
      confirm ({label || 'after seller prepares your order'}). Based on farm pickup pin → your delivery pin.
    </p>
  )
}
