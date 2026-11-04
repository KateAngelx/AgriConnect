'use server'

import { revalidatePath } from 'next/cache'
import { updateBuyerProfile } from '@/server/buyer-account'
import { requireApprovedBuyer } from '@/server/guards'

export async function updateProfileAction(_state, formData) {
  const user = await requireApprovedBuyer()
  let savedAddresses = []
  try {
    savedAddresses = JSON.parse(String(formData.get('savedAddresses') || '[]'))
  } catch {
    return { error: 'Saved locations could not be read. Please try again.' }
  }
  if (!Array.isArray(savedAddresses)) savedAddresses = []

  const draftLabel = String(formData.get('draftLabel') || '').trim()
  const draftAddress = String(formData.get('draftAddress') || '').trim()
  const draftLandmark = String(formData.get('draftLandmark') || '').trim()
  const draftLat = String(formData.get('draftLat') || '').trim()
  const draftLng = String(formData.get('draftLng') || '').trim()
  const draftStarted = Boolean(draftAddress || draftLandmark || draftLat || draftLng)
  if (draftStarted) {
    if (!draftLabel || draftAddress.length < 10) {
      return { error: 'Add a location name and a complete delivery address.' }
    }
    if (!draftLat || !draftLng) {
      return { error: 'Search for the place or drop a pin before saving this location.' }
    }
    const duplicate = savedAddresses.some((item) => (
      String(item.address || '').trim() === draftAddress
      && Number(item.lat) === Number(draftLat)
      && Number(item.lng) === Number(draftLng)
    ))
    if (!duplicate) {
      savedAddresses = [
        ...savedAddresses,
        {
          id: crypto.randomUUID(),
          label: draftLabel,
          address: draftAddress,
          landmark: draftLandmark,
          lat: Number(draftLat),
          lng: Number(draftLng),
        },
      ]
    }
  }

  const result = await updateBuyerProfile(user, {
    name: formData.get('name'),
    savedAddresses,
  })
  if (result.error) return { error: result.error }
  revalidatePath('/account/settings')
  revalidatePath('/account')
  return { ok: true }
}
