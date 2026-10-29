'use client'

import { useActionState, useState } from 'react'
import { updateProfileAction } from '@/app/(frontend)/account/settings/actions'
import { LocationPicker } from '@/components/location-picker'

const field =
  'mt-2 w-full rounded-xl border border-[#173c2c]/12 bg-white px-4 py-2.5 text-sm outline-none ring-[#5dbb38]/30 focus:ring-2'

export function BuyerSettingsForm({ user }) {
  const [state, action, pending] = useActionState(updateProfileAction, { error: '' })
  const [addresses, setAddresses] = useState(Array.isArray(user.savedAddresses) ? user.savedAddresses : [])
  const [label, setLabel] = useState('Home')
  const [address, setAddress] = useState('')
  const [landmark, setLandmark] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [addressError, setAddressError] = useState('')

  const addAddress = () => {
    if (!label.trim() || address.trim().length < 10) {
      setAddressError('Add a location name and a complete delivery address.')
      return
    }
    if (!lat || !lng) {
      setAddressError('Drop a pin on the map before saving this location.')
      return
    }
    if (addresses.length >= 10) {
      setAddressError('You can save up to 10 delivery locations.')
      return
    }
    setAddresses((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        label: label.trim(),
        address: address.trim(),
        landmark: landmark.trim(),
        lat: Number(lat),
        lng: Number(lng),
      },
    ])
    setAddress('')
    setLandmark('')
    setLat('')
    setLng('')
    setAddressError('')
  }

  return (
    <form action={action} className="max-w-2xl space-y-4">
      <div>
        <label className="text-sm font-bold" htmlFor="name">Full name</label>
        <input id="name" name="name" required defaultValue={user.name} className={field} />
      </div>
      <div>
        <label className="text-sm font-bold" htmlFor="email">Email</label>
        <input id="email" name="email" readOnly value={user.email} className={`${field} bg-[#f7f7f2] text-[#647066]`} />
      </div>
      <input type="hidden" name="savedAddresses" value={JSON.stringify(addresses)} />

      <div className="border-t border-[#173c2c]/10 pt-5">
        <h3 className="text-lg font-bold">Saved delivery locations</h3>
        <p className="mt-1 text-sm text-[#647066]">Save home, work, market, farm, or other places for faster checkout.</p>
        {addresses.length ? (
          <div className="mt-4 grid gap-3">
            {addresses.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-4 rounded-2xl border border-[#173c2c]/10 p-4">
                <div className="min-w-0">
                  <p className="font-bold">{item.label}</p>
                  <p className="mt-1 text-sm text-[#647066]">{item.address}</p>
                  {item.landmark ? <p className="mt-1 text-xs text-[#647066]">{item.landmark}</p> : null}
                </div>
                <button type="button" onClick={() => setAddresses((current) => current.filter((addressItem) => addressItem.id !== item.id))} className="shrink-0 text-xs font-bold text-[#963b2d]">
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : <p className="mt-4 rounded-2xl bg-[#f7f7f2] p-4 text-sm text-[#647066]">No saved locations yet.</p>}

        <div className="mt-5 grid gap-4 rounded-2xl border border-[#173c2c]/10 p-4">
          <div>
            <label className="text-sm font-bold" htmlFor="addressLabel">Location name</label>
            <input id="addressLabel" value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Home, Work, Market" className={field} />
          </div>
          <div>
            <label className="text-sm font-bold" htmlFor="savedAddress">Complete address</label>
            <textarea id="savedAddress" rows={3} value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Street, barangay, city/province" className={field} />
          </div>
          <div>
            <label className="text-sm font-bold" htmlFor="savedLandmark">Landmark or directions (optional)</label>
            <input id="savedLandmark" value={landmark} onChange={(event) => setLandmark(event.target.value)} placeholder="Near gate, church, color of house" className={field} />
          </div>
          <div>
            <p className="text-sm font-bold">Delivery pin</p>
            <LocationPicker lat={lat} lng={lng} onChange={({ lat: nextLat, lng: nextLng }) => { setLat(String(nextLat)); setLng(String(nextLng)) }} />
          </div>
          {addressError ? <p role="alert" className="text-sm font-bold text-[#963b2d]">{addressError}</p> : null}
          <button type="button" onClick={addAddress} className="w-fit rounded-full border border-[#173c2c]/15 px-4 py-2 text-sm font-bold">
            + Add location
          </button>
        </div>
      </div>
      {state.error ? <p role="alert" className="rounded-xl bg-[#fff1ed] px-4 py-3 text-sm text-[#963b2d]">{state.error}</p> : null}
      {state.ok ? <p role="status" className="rounded-xl bg-[#eef8e8] px-4 py-3 text-sm text-[#3f8d29]">Profile and locations updated.</p> : null}
      <button type="submit" disabled={pending} className="rounded-full bg-[#5dbb38] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">
        {pending ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  )
}
