'use client'

import { useEffect, useRef, useState } from 'react'
import { isValidPin, parseCoord, PH_DEFAULT_CENTER } from '@/lib/geo'

export function LocationPicker({ lat, lng, onChange, height = 260 }) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markerRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [locating, setLocating] = useState(false)
  const [locationMessage, setLocationMessage] = useState('')

  const initialLat = parseCoord(lat) ?? PH_DEFAULT_CENTER.lat
  const initialLng = parseCoord(lng) ?? PH_DEFAULT_CENTER.lng

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css')
      if (cancelled || !mapRef.current) return

      const map = L.map(mapRef.current).setView([initialLat, initialLng], isValidPin(parseCoord(lat), parseCoord(lng)) ? 15 : 6)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map)

      const placeMarker = (latitude, longitude) => {
        if (markerRef.current) markerRef.current.remove()
        markerRef.current = L.marker([latitude, longitude]).addTo(map)
      }

      if (isValidPin(parseCoord(lat), parseCoord(lng))) {
        placeMarker(parseCoord(lat), parseCoord(lng))
      }

      map.on('click', (event) => {
        const { lat: clickLat, lng: clickLng } = event.latlng
        placeMarker(clickLat, clickLng)
        onChange?.({ lat: clickLat, lng: clickLng })
      })

      mapInstance.current = map
      setReady(true)
    })()

    return () => {
      cancelled = true
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
      }
    }
  }, [])

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationMessage('Location services are not supported by this browser.')
      return
    }

    setLocating(true)
    setLocationMessage('Finding your current location…')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const latitude = coords.latitude
        const longitude = coords.longitude
        if (!isValidPin(latitude, longitude)) {
          setLocationMessage('Your current location is outside the supported area. Please drop the pin manually.')
          setLocating(false)
          return
        }

        if (markerRef.current) markerRef.current.remove()
        if (mapInstance.current) {
          void (async () => {
            const L = (await import('leaflet')).default
            if (!mapInstance.current) return
            markerRef.current = L.marker([latitude, longitude]).addTo(mapInstance.current)
            mapInstance.current.setView([latitude, longitude], 16)
          })()
        }
        onChange?.({ lat: latitude, lng: longitude })
        setLocationMessage('Current location added. You can still adjust the pin on the map.')
        setLocating(false)
      },
      (error) => {
        const messages = {
          1: 'Location permission was denied. Allow location access or drop the pin manually.',
          2: 'Your location could not be determined. Please try again or drop the pin manually.',
          3: 'Finding your location took too long. Please try again or drop the pin manually.',
        }
        setLocationMessage(messages[error.code] || 'Unable to use your current location.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-[#647066]">Tap the map to set the pin, or use your current location.</p>
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={!ready || locating}
          className="rounded-xl border border-[#173c2c]/15 bg-white px-3 py-2 text-xs font-bold text-[#173c2c] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {locating ? 'Finding location…' : 'Use my current location'}
        </button>
      </div>
      <div className="overflow-hidden rounded-xl border border-[#173c2c]/10">
        <div ref={mapRef} style={{ height }} className="w-full bg-[#eef0ea]" />
      </div>
      {locationMessage ? <p className="text-xs text-[#647066]" role="status">{locationMessage}</p> : null}
      {!ready ? <p className="text-xs text-[#647066]">Loading map…</p> : null}
    </div>
  )
}
