'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { updateProfileAction } from '@/app/(frontend)/account/settings/actions'
import { LocationPicker } from '@/components/location-picker'
import { DashboardIcon } from '@/components/dashboard-icons'

const field = 'ui-field mt-2'

export function BuyerSettingsForm({ user }) {
  const [state, action, pending] = useActionState(updateProfileAction, { error: '' })
  const [addresses, setAddresses] = useState(Array.isArray(user.savedAddresses) ? user.savedAddresses : [])
  const [label, setLabel] = useState('Home')
  const [address, setAddress] = useState('')
  const [landmark, setLandmark] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [addressError, setAddressError] = useState('')
  const [hasUnsavedLocations, setHasUnsavedLocations] = useState(false)
  const addressesInputRef = useRef(null)
  const savedKey = JSON.stringify(user.savedAddresses ?? [])

  useEffect(() => {
    if (addressesInputRef.current) addressesInputRef.current.value = JSON.stringify(addresses)
  }, [addresses])

  useEffect(() => {
    if (!state.ok) return
    setAddresses(JSON.parse(savedKey))
    setLabel('Home')
    setAddress('')
    setLandmark('')
    setLat('')
    setLng('')
    setAddressError('')
    setHasUnsavedLocations(false)
  }, [state.ok, savedKey])

  const clearDraft = () => {
    setLabel('Home')
    setAddress('')
    setLandmark('')
    setLat('')
    setLng('')
    setAddressError('')
  }

  const draftLocation = (currentAddresses) => {
    const started = Boolean(address.trim() || landmark.trim() || lat || lng)
    if (!started) return { empty: true }
    if (!label.trim() || address.trim().length < 10) {
      return { error: 'Add a location name and a complete delivery address.' }
    }
    if (!lat || !lng) {
      return { error: 'Search for the place or drop a pin before saving this location.' }
    }
    if (currentAddresses.length >= 10) {
      return { error: 'You can save up to 10 delivery locations.' }
    }
    return {
      location: {
        id: crypto.randomUUID(),
        label: label.trim(),
        address: address.trim(),
        landmark: landmark.trim(),
        lat: Number(lat),
        lng: Number(lng),
      },
    }
  }

  const addAddress = () => {
    const draft = draftLocation(addresses)
    if (draft.empty) {
      setAddressError('Add a location name, address, and pin first.')
      return
    }
    if (draft.error) {
      setAddressError(draft.error)
      return
    }
    setAddresses((current) => [...current, draft.location])
    clearDraft()
    setHasUnsavedLocations(true)
  }

  const prepareSave = (event) => {
    const draft = draftLocation(addresses)
    if (draft.error) {
      event.preventDefault()
      setAddressError(draft.error)
    }
  }

  return (
    <form action={action} onSubmit={prepareSave} className="max-w-2xl space-y-4">
      <div>
        <label className="text-sm font-bold" htmlFor="name">Full name</label>
        <input id="name" name="name" required defaultValue={user.name} className={field} />
      </div>
      <div>
        <label className="text-sm font-bold" htmlFor="phone">Contact number</label>
        <input id="phone" name="phone" type="tel" required defaultValue={user.phone || ''} placeholder="09XXXXXXXXX" className={field} />
      </div>
      <div>
        <label className="text-sm font-bold" htmlFor="email">Email</label>
        <input id="email" name="email" readOnly value={user.email} className={`${field} bg-[#f7f7f2] text-[#647066]`} />
      </div>
      <input ref={addressesInputRef} type="hidden" name="savedAddresses" defaultValue={JSON.stringify(addresses)} />

      <div className="border-t border-[#173c2c]/10 pt-5">
        <h3 className="text-lg font-bold">Saved delivery locations</h3>
        <p className="mt-1 text-sm text-[#647066]">Search or drop a pin, then choose Save changes. The place is stored with your profile.</p>
        {addresses.length ? (
          <div className="mt-4 grid gap-3">
            {addresses.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-4 rounded-2xl border border-[#173c2c]/10 p-4">
                <div className="min-w-0">
                  <p className="font-bold">{item.label}</p>
                  <p className="mt-1 text-sm text-[#647066]">{item.address}</p>
                  {item.landmark ? <p className="mt-1 text-xs text-[#647066]">{item.landmark}</p> : null}
                </div>
                <button type="button" onClick={() => { setAddresses((current) => current.filter((addressItem) => addressItem.id !== item.id)); setHasUnsavedLocations(true) }} className="grid size-9 shrink-0 place-items-center rounded-lg border border-red-200 text-[#963b2d] hover:bg-red-50" aria-label={`Remove ${item.label}`} title={`Remove ${item.label}`}>
                  <DashboardIcon name="trash" className="size-4" />
                </button>
              </div>
            ))}
          </div>
        ) : <p className="mt-4 rounded-2xl bg-[#f7f7f2] p-4 text-sm text-[#647066]">No saved locations yet.</p>}

        <div className="mt-5 grid gap-4 rounded-2xl border border-[#173c2c]/10 p-4">
          <div>
            <label className="text-sm font-bold" htmlFor="addressLabel">Location name</label>
            <input id="addressLabel" name="draftLabel" value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Home, Work, Market" className={field} />
          </div>
          <div>
            <label className="text-sm font-bold" htmlFor="savedAddress">Complete address</label>
            <textarea id="savedAddress" name="draftAddress" rows={3} value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Street, barangay, city/province" className={field} />
          </div>
          <div>
            <label className="text-sm font-bold" htmlFor="savedLandmark">Landmark or directions (optional)</label>
            <input id="savedLandmark" name="draftLandmark" value={landmark} onChange={(event) => setLandmark(event.target.value)} placeholder="Near gate, church, color of house" className={field} />
          </div>
          <div>
            <p className="text-sm font-bold">Delivery pin</p>
            <input type="hidden" name="draftLat" value={lat} />
            <input type="hidden" name="draftLng" value={lng} />
            <LocationPicker
              kind="dropoff"
              lat={lat}
              lng={lng}
              onChange={({ lat: nextLat, lng: nextLng, label: place }) => {
                setLat(String(nextLat))
                setLng(String(nextLng))
                if (place) setAddress((current) => (current.trim() ? current : place))
              }}
            />
          </div>
          {addressError ? <p role="alert" className="text-sm font-bold text-[#963b2d]">{addressError}</p> : null}
          <button type="button" onClick={addAddress} className="btn btn-secondary w-fit">
            + Add to saved locations
          </button>
        </div>
      </div>
      {hasUnsavedLocations ? <p role="status" className="rounded-xl bg-[#fff8ed] px-4 py-3 text-sm font-semibold text-[#7a4b12]">Location changes are ready. Select “Save changes” to keep them.</p> : null}
      {state.error ? <p role="alert" className="rounded-xl bg-[#fff1ed] px-4 py-3 text-sm text-[#963b2d]">{state.error}</p> : null}
      {state.ok ? <p role="status" className="rounded-xl bg-[#eef8e8] px-4 py-3 text-sm text-[#3f8d29]">Profile and locations updated and saved.</p> : null}
      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  )
}
