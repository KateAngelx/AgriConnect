'use client'

import { useEffect, useRef } from 'react'
import { isValidPin, openStreetMapLink, parseCoord } from '@/lib/geo'
import { mapPinIcon } from '@/lib/map-pins'

/**
 * Farm pickup → buyer delivery pins on one map.
 */
export function LocationRouteMap({
  pickupLat,
  pickupLng,
  deliveryLat,
  deliveryLng,
  height = 260,
  courierLat,
  courierLng,
}) {
  const mapRef = useRef(null)
  const instanceRef = useRef(null)
  const plat = parseCoord(pickupLat)
  const plng = parseCoord(pickupLng)
  const dlat = parseCoord(deliveryLat)
  const dlng = parseCoord(deliveryLng)
  const hasPickup = isValidPin(plat, plng)
  const hasDelivery = isValidPin(dlat, dlng)
  const clat = parseCoord(courierLat)
  const clng = parseCoord(courierLng)
  const hasCourier = isValidPin(clat, clng)

  useEffect(() => {
    if (!mapRef.current || (!hasPickup && !hasDelivery)) return
    let cancelled = false
    ;(async () => {
      const L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css')
      if (cancelled || !mapRef.current) return
      if (instanceRef.current) {
        instanceRef.current.remove()
        instanceRef.current = null
      }
      const center = hasDelivery ? [dlat, dlng] : [plat, plng]
      const map = L.map(mapRef.current, { scrollWheelZoom: false }).setView(center, 13)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map)
      const bounds = []
      if (hasPickup) {
        L.marker([plat, plng], { icon: mapPinIcon(L, 'pickup') }).addTo(map).bindPopup('Seller pickup')
        bounds.push([plat, plng])
      }
      if (hasDelivery) {
        L.marker([dlat, dlng], { icon: mapPinIcon(L, 'dropoff') }).addTo(map).bindPopup('Buyer drop-off')
        bounds.push([dlat, dlng])
      }
      if (hasCourier) {
        L.marker([clat, clng], { icon: mapPinIcon(L, 'delivery') }).addTo(map).bindPopup('Courier location')
      }
      if (hasPickup && hasDelivery) {
        const routeLine = L.polyline([[plat, plng], [dlat, dlng]], {
          color: '#4b9f30', weight: 3, opacity: 0.75, dashArray: '6 8',
        }).addTo(map)
        fetch(`https://router.project-osrm.org/route/v1/driving/${plng},${plat};${dlng},${dlat}?overview=full&geometries=geojson`)
          .then((response) => response.ok ? response.json() : Promise.reject(new Error('Route unavailable')))
          .then((data) => {
            const geometry = data?.routes?.[0]?.geometry?.coordinates
            if (!cancelled && geometry?.length) {
              map.removeLayer(routeLine)
              L.polyline(geometry.map(([lng, lat]) => [lat, lng]), {
                color: '#4b9f30', weight: 4, opacity: 0.9,
              }).addTo(map)
            }
          })
          .catch(() => {})
        map.fitBounds(bounds, { padding: [28, 28] })
      }
      instanceRef.current = map
      setTimeout(() => map.invalidateSize(), 0)
    })()
    return () => {
      cancelled = true
      if (instanceRef.current) {
        instanceRef.current.remove()
        instanceRef.current = null
      }
    }
  }, [plat, plng, dlat, dlng, clat, clng, hasPickup, hasDelivery, hasCourier])

  if (!hasPickup && !hasDelivery) {
    return (
      <p className="rounded-xl border border-dashed border-[#173c2c]/15 bg-[#faf9f4] px-4 py-6 text-sm text-[#647066]">
        Map pins not available yet. Seller pickup and buyer delivery locations appear after checkout.
      </p>
    )
  }

  const routeHref = hasPickup && hasDelivery
    ? `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${plat}%2C${plng}%3B${dlat}%2C${dlng}`
    : openStreetMapLink(hasDelivery ? dlat : plat, hasDelivery ? dlng : plng)

  return (
    <div className="overflow-hidden rounded-xl border border-[#d5e4d4]">
      <div ref={mapRef} style={{ height }} className="w-full bg-[#eef0ea]" aria-label="Route from seller pickup to buyer drop-off" />
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#d5e4d4] bg-white px-3 py-2 text-[12px] text-[#142016]">
        <div className="flex flex-wrap gap-3">
          {hasPickup ? <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[#2e7d32]" /> Seller pickup</span> : <span className="text-[#5c6f62]">Seller pickup pin is missing</span>}
          {hasDelivery ? <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[#ef7d32]" /> Buyer drop-off</span> : <span className="text-[#5c6f62]">Buyer drop-off pin is missing</span>}
        </div>
        <a href={routeHref} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#2e7d32]">
          {hasPickup && hasDelivery ? 'Open route' : 'Open in map'}
        </a>
      </div>
    </div>
  )
}
