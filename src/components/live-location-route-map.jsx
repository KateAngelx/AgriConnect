'use client'

import { useEffect, useState } from 'react'
import { LocationRouteMap } from '@/components/location-route-map'

export function LiveLocationRouteMap({ deliveryId, pickupLat, pickupLng, deliveryLat, deliveryLng, initialCourierLat, initialCourierLng, height = 220 }) {
  const [courierLocation, setCourierLocation] = useState({
    lat: initialCourierLat ?? null,
    lng: initialCourierLng ?? null,
  })

  useEffect(() => {
    if (!deliveryId) return

    let stopped = false
    async function refresh() {
      try {
        const response = await fetch(`/api/delivery/location?deliveryId=${encodeURIComponent(deliveryId)}`, { cache: 'no-store' })
        if (!response.ok) return
        const location = await response.json()
        if (!stopped) setCourierLocation({ lat: location.lat, lng: location.lng })
      } catch {
        // Keep the last known courier position if polling fails.
      }
    }

    refresh()
    const interval = window.setInterval(refresh, 10_000)
    return () => {
      stopped = true
      window.clearInterval(interval)
    }
  }, [deliveryId])

  return (
    <LocationRouteMap
      pickupLat={pickupLat}
      pickupLng={pickupLng}
      deliveryLat={deliveryLat}
      deliveryLng={deliveryLng}
      courierLat={courierLocation.lat}
      courierLng={courierLocation.lng}
      height={height}
    />
  )
}
