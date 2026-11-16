'use client'

import { useEffect, useRef } from 'react'
import { isValidPin, openStreetMapLink, parseCoord } from '@/lib/geo'
import { mapPinIcon } from '@/lib/map-pins'

function timeAgo(iso) {
  if (!iso) return ''
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
  if (seconds < 60) return 'just now'
  const minutes = Math.round(seconds / 60)
  return minutes < 60 ? `${minutes} min ago` : `${Math.round(minutes / 60)} h ago`
}

/**
 * Seller pickup (S), buyer drop-off (B) and, when known, the courier (C) on one map.
 * The map is built once per pickup/drop-off pair; the courier pin moves in place so live
 * updates do not redraw the map or refetch the road route.
 *
 * `courierHeadingTo` is 'pickup' before the courier collects the order and 'dropoff' after;
 * a dashed line runs from the courier to that next stop.
 */
export function LocationRouteMap({
  pickupLat,
  pickupLng,
  deliveryLat,
  deliveryLng,
  height = 260,
  courierLat,
  courierLng,
  courierUpdatedAt = null,
  courierLabel = 'Courier',
  courierHeadingTo = 'dropoff',
}) {
  const mapRef = useRef(null)
  const instanceRef = useRef(null)
  const leafletRef = useRef(null)
  const courierLayerRef = useRef(null)
  const fittedCourierRef = useRef(false)
  const plat = parseCoord(pickupLat)
  const plng = parseCoord(pickupLng)
  const dlat = parseCoord(deliveryLat)
  const dlng = parseCoord(deliveryLng)
  const clat = parseCoord(courierLat)
  const clng = parseCoord(courierLng)
  const hasPickup = isValidPin(plat, plng)
  const hasDelivery = isValidPin(dlat, dlng)
  const hasCourier = isValidPin(clat, clng)
  const hasAnyPin = hasPickup || hasDelivery || hasCourier

  // Build the base map: pickup, drop-off and the road route between them.
  useEffect(() => {
    if (!mapRef.current || !hasAnyPin) return
    let cancelled = false
    ;(async () => {
      const L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css')
      if (cancelled || !mapRef.current) return
      leafletRef.current = L
      const center = hasDelivery ? [dlat, dlng] : hasPickup ? [plat, plng] : [clat, clng]
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
      if (hasPickup && hasDelivery) {
        const routeLine = L.polyline([[plat, plng], [dlat, dlng]], {
          color: '#4b9f30', weight: 3, opacity: 0.75, dashArray: '6 8',
        }).addTo(map)
        fetch(`https://router.project-osrm.org/route/v1/driving/${plng},${plat};${dlng},${dlat}?overview=full&geometries=geojson`)
          .then((response) => (response.ok ? response.json() : Promise.reject(new Error('Route unavailable'))))
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
      }
      if (bounds.length > 1) map.fitBounds(bounds, { padding: [28, 28] })
      instanceRef.current = map
      fittedCourierRef.current = false
      setTimeout(() => map.invalidateSize(), 0)
      // Draw the courier now if their position arrived before the map finished loading.
      window.dispatchEvent(new Event('agriconnect:map-ready'))
    })()
    return () => {
      cancelled = true
      courierLayerRef.current = null
      if (instanceRef.current) {
        instanceRef.current.remove()
        instanceRef.current = null
      }
    }
    // The courier position is handled by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plat, plng, dlat, dlng, hasPickup, hasDelivery, hasAnyPin])

  // Courier pin + dashed line to the next stop, updated in place.
  useEffect(() => {
    function drawCourier() {
      const L = leafletRef.current
      const map = instanceRef.current
      if (!L || !map) return
      if (courierLayerRef.current) {
        courierLayerRef.current.remove()
        courierLayerRef.current = null
      }
      if (!hasCourier) return
      const layer = L.layerGroup().addTo(map)
      L.marker([clat, clng], { icon: mapPinIcon(L, 'delivery'), zIndexOffset: 500 })
        .addTo(layer)
        .bindPopup(courierLabel)
      const nextStop =
        courierHeadingTo === 'pickup' && hasPickup ? [plat, plng] : hasDelivery ? [dlat, dlng] : null
      if (nextStop) {
        L.polyline([[clat, clng], nextStop], { color: '#1e6fd9', weight: 3, opacity: 0.8, dashArray: '4 6' }).addTo(layer)
      }
      courierLayerRef.current = layer
      if (!fittedCourierRef.current) {
        const points = [[clat, clng]]
        if (hasPickup) points.push([plat, plng])
        if (hasDelivery) points.push([dlat, dlng])
        if (points.length > 1) map.fitBounds(points, { padding: [32, 32] })
        else map.setView([clat, clng], 15)
        fittedCourierRef.current = true
      }
    }
    drawCourier()
    window.addEventListener('agriconnect:map-ready', drawCourier)
    return () => window.removeEventListener('agriconnect:map-ready', drawCourier)
  }, [clat, clng, hasCourier, courierHeadingTo, courierLabel, plat, plng, dlat, dlng, hasPickup, hasDelivery])

  if (!hasAnyPin) {
    return (
      <p className="rounded-xl border border-dashed border-[#173c2c]/15 bg-[#faf9f4] px-4 py-6 text-sm text-[#647066]">
        Map pins not available yet. Seller pickup and buyer delivery locations appear after checkout.
      </p>
    )
  }

  const routeHref =
    hasCourier && hasDelivery
      ? `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${clat}%2C${clng}%3B${dlat}%2C${dlng}`
      : hasPickup && hasDelivery
        ? `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${plat}%2C${plng}%3B${dlat}%2C${dlng}`
        : openStreetMapLink(hasDelivery ? dlat : hasPickup ? plat : clat, hasDelivery ? dlng : hasPickup ? plng : clng)

  return (
    <div className="overflow-hidden rounded-xl border border-[#d5e4d4]">
      <div ref={mapRef} style={{ height }} className="w-full bg-[#eef0ea]" aria-label="Map of seller pickup, buyer drop-off and courier" />
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#d5e4d4] bg-white px-3 py-2 text-[12px] text-[#142016]">
        <div className="flex flex-wrap gap-3">
          {hasPickup ? <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[#2e7d32]" /> Seller pickup</span> : <span className="text-[#5c6f62]">Seller pickup pin is missing</span>}
          {hasDelivery ? <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[#ef7d32]" /> Buyer drop-off</span> : <span className="text-[#5c6f62]">Buyer drop-off pin is missing</span>}
          {hasCourier ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-[#1e6fd9]" /> {courierLabel}
              {courierUpdatedAt ? <span className="text-[#5c6f62]">· {timeAgo(courierUpdatedAt)}</span> : null}
            </span>
          ) : null}
        </div>
        <a href={routeHref} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#2e7d32]">
          {hasCourier && hasDelivery ? 'Open route from courier' : hasPickup && hasDelivery ? 'Open route' : 'Open in map'}
        </a>
      </div>
    </div>
  )
}
