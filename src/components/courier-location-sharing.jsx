'use client'

import { useEffect, useState } from 'react'

export function CourierLocationSharing({ deliveryId, active }) {
  const [sharing, setSharing] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!sharing || !active || !navigator.geolocation) return

    const share = async (position) => {
      await fetch('/api/delivery/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveryId,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }),
      })
    }

    const update = (position) => {
      share(position).catch(() => setMessage('Location could not be shared.'))
    }
    const error = () => setMessage('Allow location access to share live delivery movement.')
    const watcher = navigator.geolocation.watchPosition(update, error, {
      enableHighAccuracy: true,
      maximumAge: 10_000,
      timeout: 15_000,
    })
    return () => navigator.geolocation.clearWatch(watcher)
  }, [sharing, active, deliveryId])

  if (!active) return null

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => {
          setSharing((value) => !value)
          setMessage('')
        }}
        className={`btn ${sharing ? 'btn-secondary' : 'btn-primary'}`}
      >
        {sharing ? 'Stop sharing location' : 'Share live location'}
      </button>
      {message ? <p className="mt-2 text-xs text-[#963b2d]" role="status">{message}</p> : null}
    </div>
  )
}
