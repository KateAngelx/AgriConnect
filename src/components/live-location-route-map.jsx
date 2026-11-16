'use client'

import { useEffect, useState } from 'react'
import { LocationRouteMap } from '@/components/location-route-map'

const POLL_MS = 10_000

// Buyer (and admin) view of a delivery: pickup, drop-off, and the courier's last shared position.
export function LiveLocationRouteMap({
  deliveryId,
  pickupLat,
  pickupLng,
  deliveryLat,
  deliveryLng,
  initialCourierLat,
  initialCourierLng,
  height = 220,
}) {
  const [courier, setCourier] = useState({
    lat: initialCourierLat ?? null,
    lng: initialCourierLng ?? null,
    updatedAt: null,
    status: '',
  })

  useEffect(() => {
    if (!deliveryId) return undefined
    let stopped = false
    async function refresh() {
      if (document.visibilityState === 'hidden') return
      try {
        const response = await fetch(`/api/delivery/location?deliveryId=${encodeURIComponent(deliveryId)}`, {
          cache: 'no-store',
        })
        if (!response.ok) return
        const location = await response.json()
        if (!stopped) setCourier({ lat: location.lat, lng: location.lng, updatedAt: location.updatedAt, status: location.status || '' })
      } catch {
        // Keep the last known position if a poll fails.
      }
    }
    refresh()
    const interval = window.setInterval(refresh, POLL_MS)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      stopped = true
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [deliveryId])

  // Only show the courier while the delivery is underway.
  const underway = ['accepted', 'picked-up', 'in-transit'].includes(courier.status)
  return (
    <div className="space-y-2">
      <LocationRouteMap
        pickupLat={pickupLat}
        pickupLng={pickupLng}
        deliveryLat={deliveryLat}
        deliveryLng={deliveryLng}
        courierLat={underway ? courier.lat : null}
        courierLng={underway ? courier.lng : null}
        courierUpdatedAt={courier.updatedAt}
        courierHeadingTo={courier.status === 'accepted' ? 'pickup' : 'dropoff'}
        height={height}
      />
      {underway && (courier.lat == null || courier.lng == null) ? (
        <p className="text-[12px] text-[#5c6f62]">The courier has not shared a live location yet.</p>
      ) : null}
    </div>
  )
}
