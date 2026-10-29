'use client'

import { useEffect, useRef } from 'react'
import { isValidPin, openStreetMapLink, parseCoord } from '@/lib/geo'

export function LocationMap({ lat, lng, height = 220, label = 'Pickup pin' }) {
  const mapRef = useRef(null)
  const instanceRef = useRef(null)
  const latitude = parseCoord(lat)
  const longitude = parseCoord(lng)

  useEffect(() => {
    if (!mapRef.current || !isValidPin(latitude, longitude)) return
    let cancelled = false
    ;(async () => {
      const L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css')
      if (cancelled || !mapRef.current) return
      if (instanceRef.current) {
        instanceRef.current.remove()
        instanceRef.current = null
      }
      const map = L.map(mapRef.current, { scrollWheelZoom: false }).setView([latitude, longitude], 15)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map)
      L.marker([latitude, longitude]).addTo(map).bindPopup(label)
      instanceRef.current = map
    })()
    return () => {
      cancelled = true
      if (instanceRef.current) {
        instanceRef.current.remove()
        instanceRef.current = null
      }
    }
  }, [latitude, longitude, label])

  if (!isValidPin(latitude, longitude)) {
    return (
      <p className="rounded-xl border border-dashed border-[#173c2c]/15 bg-[#faf9f4] px-4 py-6 text-sm text-[#647066]">
        Map pin not set yet. The seller can drop a pin in shop settings.
      </p>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#173c2c]/10">
      <div ref={mapRef} style={{ height }} className="w-full bg-[#eef0ea]" aria-label={label} />
      <a
        href={openStreetMapLink(latitude, longitude)}
        target="_blank"
        rel="noopener noreferrer"
        className="block border-t border-[#173c2c]/10 bg-white px-3 py-2 text-xs font-semibold text-[#4b9f30]"
      >
        Open in map
      </a>
    </div>
  )
}
