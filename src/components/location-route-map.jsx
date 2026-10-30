'use client'

import { useEffect, useRef } from 'react'
import { isValidPin, openStreetMapLink, parseCoord } from '@/lib/geo'

/**
 * Farm pickup → buyer delivery pins on one map.
 */
export function LocationRouteMap({
  pickupLat,
  pickupLng,
  deliveryLat,
  deliveryLng,
  height = 260,
}) {
  const mapRef = useRef(null)
  const instanceRef = useRef(null)
  const plat = parseCoord(pickupLat)
  const plng = parseCoord(pickupLng)
  const dlat = parseCoord(deliveryLat)
  const dlng = parseCoord(deliveryLng)
  const hasPickup = isValidPin(plat, plng)
  const hasDelivery = isValidPin(dlat, dlng)

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
      const pinIcon = (color) => L.divIcon({
        className: 'agriconnect-map-pin',
        html: `<span style="display:block;width:32px;height:32px;border-radius:50% 50% 50% 0;background:${color};border:4px solid:#fff;box-shadow:0 3px 10px rgba(20,32,22,.35);transform:rotate(-45deg)"><span style="display:block;width:8px;height:8px;margin:8px;border-radius:50%;background:#fff"></span></span>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
      })
      const bounds = []
      if (hasPickup) {
        L.marker([plat, plng], { icon: pinIcon('#2e7d32') }).addTo(map).bindPopup('Farm pickup')
        bounds.push([plat, plng])
      }
      if (hasDelivery) {
        L.marker([dlat, dlng], { icon: pinIcon('#ef7d32') }).addTo(map).bindPopup('Delivery drop-off')
        bounds.push([dlat, dlng])
      }
      if (hasPickup && hasDelivery) {
        L.polyline(
          [
            [plat, plng],
            [dlat, dlng],
          ],
          { color: '#4b9f30', weight: 3, opacity: 0.75, dashArray: '6 8' },
        ).addTo(map)
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
  }, [plat, plng, dlat, dlng, hasPickup, hasDelivery])

  if (!hasPickup && !hasDelivery) {
    return (
      <p className="rounded-xl border border-dashed border-[#173c2c]/15 bg-[#faf9f4] px-4 py-6 text-sm text-[#647066]">
        Map pins not available yet. Seller pickup and buyer delivery locations appear after checkout.
      </p>
    )
  }

  const linkLat = hasDelivery ? dlat : plat
  const linkLng = hasDelivery ? dlng : plng

  return (
    <div className="overflow-hidden rounded-xl border border-[#173c2c]/10">
      <div ref={mapRef} style={{ height }} className="w-full bg-[#eef0ea]" aria-label="Delivery route map" />
      <a
        href={openStreetMapLink(linkLat, linkLng)}
        target="_blank"
        rel="noopener noreferrer"
        className="block border-t border-[#173c2c]/10 bg-white px-3 py-2 text-xs font-semibold text-[#4b9f30]"
      >
        Open in map
      </a>
    </div>
  )
}
