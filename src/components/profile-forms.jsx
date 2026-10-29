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

export function ServiceAreaForm({ area }) {
  const [state, action, pending] = useActionState(serviceAreaAction, { error: '' })
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="text-sm font-bold text-[#142016]" htmlFor="serviceArea">
          Coverage area
        </label>
        <FieldInput id="serviceArea" name="serviceArea" required defaultValue={area} className="mt-2" />
      </div>
      {state.error ? (
        <p className="rounded-xl bg-[#fff1ed] px-4 py-3 text-sm text-[#963b2d]">{state.error}</p>
      ) : null}
      <PrimaryButton type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save area'}
      </PrimaryButton>
    </form>
  )
}
