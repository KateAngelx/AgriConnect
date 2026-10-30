'use client'

import { useActionState, useState } from 'react'
import { serviceAreaAction } from '@/app/(frontend)/delivery/actions'
import { saveProfileAction } from '@/app/(frontend)/seller/actions'
import { LocationPicker } from '@/components/location-picker'
import { FieldInput, PrimaryButton } from '@/components/dashboard-ui'

const textareaClass =
  'mt-2 w-full rounded-2xl border border-[#173c2c]/12 bg-[#fafbfa] px-4 py-3 text-sm outline-none ring-[#5dbb38]/30 focus:border-[#5dbb38] focus:ring-2'

export function SellerProfileForm({ seller }) {
  const [state, action, pending] = useActionState(saveProfileAction, { error: '' })
  const [pickupLat, setPickupLat] = useState(String(seller?.pickupLat ?? ''))
  const [pickupLng, setPickupLng] = useState(String(seller?.pickupLng ?? ''))

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="text-sm font-bold text-[#142016]" htmlFor="farmName">
          Farm or shop name
        </label>
        <FieldInput id="farmName" name="farmName" required defaultValue={seller?.farmName || ''} className="mt-2" />
      </div>
      <div>
        <label className="text-sm font-bold text-[#142016]" htmlFor="location">
          City / province (shown to buyers)
        </label>
        <FieldInput id="location" name="location" required defaultValue={seller?.location || ''} className="mt-2" />
      </div>
      <div>
        <label className="text-sm font-bold text-[#142016]" htmlFor="landmark">
          Landmark or directions (optional)
        </label>
        <FieldInput id="landmark" name="landmark" defaultValue={seller?.landmark || ''} className="mt-2" />
      </div>
      <div>
        <p className="text-sm font-bold text-[#142016]">Pickup pin on map</p>
        <LocationPicker
          lat={pickupLat}
          lng={pickupLng}
          onChange={({ lat, lng }) => {
            setPickupLat(String(lat))
            setPickupLng(String(lng))
          }}
        />
        <input type="hidden" name="pickupLat" value={pickupLat} />
        <input type="hidden" name="pickupLng" value={pickupLng} />
      </div>
      <div>
        <label className="text-sm font-bold text-[#142016]" htmlFor="description">
          About your farm
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={seller?.description || ''}
          className={textareaClass}
        />
      </div>
      {state.error ? (
        <p className="rounded-xl bg-[#fff1ed] px-4 py-3 text-sm text-[#963b2d]">{state.error}</p>
      ) : null}
      <PrimaryButton type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save profile'}
      </PrimaryButton>
    </form>
  )
}

export function ServiceAreaForm({ area, lat = '', lng = '', locations = [] }) {
  const [state, action, pending] = useActionState(serviceAreaAction, { error: '' })
  const [serviceLat, setServiceLat] = useState(String(lat ?? ''))
  const [serviceLng, setServiceLng] = useState(String(lng ?? ''))
  const [coverageAreas, setCoverageAreas] = useState(() =>
    locations.filter((item) => item?.id !== 'service-area-pin' && item?.address).length
      ? locations.filter((item) => item?.id !== 'service-area-pin' && item?.address)
      : area
        ? [{ id: 'service-area-pin', label: area, address: area, lat: Number(lat), lng: Number(lng) }]
        : [],
  )
  const [areaName, setAreaName] = useState(area || '')
  const [error, setError] = useState('')

  const addArea = () => {
    if (areaName.trim().length < 2 || !serviceLat || !serviceLng) {
      setError('Enter an area name and drop its pin.')
      return
    }
    setCoverageAreas((current) => [...current.filter((item) => item.id !== 'service-area-pin'), {
      id: crypto.randomUUID(),
      label: areaName.trim(),
      address: areaName.trim(),
      landmark: '',
      lat: Number(serviceLat),
      lng: Number(serviceLng),
    }])
    setError('')
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="serviceLocations" value={JSON.stringify(coverageAreas)} />
      <div>
        <label className="text-sm font-bold text-[#142016]" htmlFor="serviceArea">Coverage area</label>
        <FieldInput id="serviceArea" name="serviceArea" required value={areaName} onChange={(event) => setAreaName(event.target.value)} className="mt-2" />
      </div>
      <div>
        <p className="text-sm font-bold text-[#142016]">Service-area pin</p>
        <LocationPicker lat={serviceLat} lng={serviceLng} onChange={({ lat, lng }) => { setServiceLat(String(lat)); setServiceLng(String(lng)) }} />
        <input type="hidden" name="serviceAreaLat" value={serviceLat} />
        <input type="hidden" name="serviceAreaLng" value={serviceLng} />
      </div>
      <button type="button" onClick={addArea} className="rounded-full border border-[#173c2c]/15 px-4 py-2 text-sm font-bold">
        + Save this service area
      </button>
      {coverageAreas.length ? (
        <div className="grid gap-2">
          {coverageAreas.map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-3 rounded-xl border border-[#173c2c]/10 p-3">
              <div><p className="text-sm font-bold">{item.label}</p><p className="text-xs text-[#647066]">{item.address}</p></div>
              <button type="button" onClick={() => setCoverageAreas((current) => current.filter((entry) => entry.id !== item.id))} className="text-xs font-bold text-[#963b2d]">Remove</button>
            </div>
          ))}
        </div>
      ) : null}
      {error || state.error ? <p className="rounded-xl bg-[#fff1ed] px-4 py-3 text-sm text-[#963b2d]">{error || state.error}</p> : null}
      <PrimaryButton type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save areas'}</PrimaryButton>
    </form>
  )
}
