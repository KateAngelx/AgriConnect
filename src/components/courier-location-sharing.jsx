'use client'

import { useEffect, useRef, useState } from 'react'
import { LocationRouteMap } from '@/components/location-route-map'

const SEND_EVERY_MS = 8_000
const storageKey = (deliveryId) => `agriconnect-share-location:${deliveryId}`

function readSaved(deliveryId) {
  try {
    return localStorage.getItem(storageKey(deliveryId)) === '1'
  } catch {
    return false
  }
}

function writeSaved(deliveryId, on) {
  try {
    if (on) localStorage.setItem(storageKey(deliveryId), '1')
    else localStorage.removeItem(storageKey(deliveryId))
  } catch {
    // Sharing still works for this visit without storage.
  }
}

/**
 * Courier's job map. While sharing is on, the courier's own position shows on the map
 * and is sent to the server (at most every 8 seconds) so the buyer can follow along.
 * The on/off choice is remembered per job on this device.
 */
export function CourierJobMap({ deliveryId, active, status, pickupLat, pickupLng, deliveryLat, deliveryLng, height = 220 }) {
  const [sharing, setSharing] = useState(false)
  const [position, setPosition] = useState(null)
  const [message, setMessage] = useState('')
  const lastSent = useRef(0)

  useEffect(() => {
    if (active && readSaved(deliveryId)) setSharing(true)
  }, [active, deliveryId])

  useEffect(() => {
    if (!sharing || !active) return undefined
    if (!navigator.geolocation) {
      setMessage('This device cannot share its location.')
      return undefined
    }
    const send = async (lat, lng) => {
      const now = Date.now()
      if (now - lastSent.current < SEND_EVERY_MS) return
      lastSent.current = now
      try {
        const response = await fetch('/api/delivery/location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deliveryId, lat, lng }),
        })
        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          setMessage(data.error || 'Location could not be shared.')
        } else {
          setMessage('')
        }
      } catch {
        setMessage('Location could not be shared. It will retry automatically.')
      }
    }
    const watcher = navigator.geolocation.watchPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude, at: new Date().toISOString() }
        setPosition(next)
        send(next.lat, next.lng)
      },
      (error) => {
        setMessage(
          error.code === error.PERMISSION_DENIED
            ? 'Allow location access in your browser to share live delivery movement.'
            : 'Waiting for a location fix…',
        )
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
    )
    return () => navigator.geolocation.clearWatch(watcher)
  }, [sharing, active, deliveryId])

  function toggle() {
    const next = !sharing
    setSharing(next)
    writeSaved(deliveryId, next)
    setMessage('')
    lastSent.current = 0
    if (!next) setPosition(null)
  }

  const showMap = pickupLat || deliveryLat || position
  return (
    <div className="mt-4 space-y-2">
      {active ? (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={toggle} className={`btn ${sharing ? 'btn-secondary' : 'btn-primary'}`}>
            {sharing ? 'Stop sharing location' : 'Share live location'}
          </button>
          <span className="text-[12px] text-[#5c6f62]">
            {sharing
              ? position
                ? 'Sharing your location with the buyer.'
                : 'Finding your location…'
              : 'The buyer sees your position on their map while sharing is on.'}
          </span>
        </div>
      ) : null}
      {message ? <p className="text-xs text-[#963b2d]" role="status">{message}</p> : null}
      {showMap ? (
        <LocationRouteMap
          pickupLat={pickupLat}
          pickupLng={pickupLng}
          deliveryLat={deliveryLat}
          deliveryLng={deliveryLng}
          courierLat={position?.lat}
          courierLng={position?.lng}
          courierUpdatedAt={position?.at}
          courierLabel="You"
          courierHeadingTo={status === 'accepted' ? 'pickup' : 'dropoff'}
          height={height}
        />
      ) : null}
    </div>
  )
}

// Kept for any older import; the job map now includes the sharing control.
export function CourierLocationSharing(props) {
  return <CourierJobMap {...props} />
}
