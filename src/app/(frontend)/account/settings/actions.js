'use server'

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
  const result = await updateBuyerProfile(user, {
    name: formData.get('name'),
    savedAddresses,
  })
  if (result.error) return { error: result.error }
  return { ok: true }
}
