import { save } from './sync'
import { readyStore } from './store'
import { isValidPin } from '@/lib/geo'

export async function updateBuyerProfile(user, input) {
  const { isApprovedBuyer } = await import('./roles')
  if (!isApprovedBuyer(user)) {
    return { error: 'Only approved buyer accounts can update profile settings.' }
  }
  const name = String(input.name ?? '').trim().slice(0, 80)
  if (name.length < 2) return { error: 'Enter your full name.' }
  const store = await readyStore()
  const record = store.users.get(user.id)
  if (!record) return { error: 'Account not found.' }
  record.name = name
  if (Array.isArray(input.savedAddresses)) {
    record.savedAddresses = input.savedAddresses
      .slice(0, 10)
      .map((address, index) => ({
        id: String(address.id || '').trim() || `address-${index + 1}-${crypto.randomUUID().slice(0, 8)}`,
        label: String(address.label || '').trim().slice(0, 40),
        address: String(address.address || '').trim().slice(0, 300),
        landmark: String(address.landmark || '').trim().slice(0, 240),
        lat: Number(address.lat),
        lng: Number(address.lng),
      }))
      .filter((address) => address.label && address.address.length >= 10 && isValidPin(address.lat, address.lng))
  }
  await save()
  return { ok: true }
}
