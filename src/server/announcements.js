import { notify } from './notifications'
import { isApprovedAdmin, isApprovedDelivery, isApprovedSeller } from './roles'
import { readyStore } from './store'

const audiences = new Set(['sellers', 'delivery', 'both'])

export async function publishAdminAnnouncement(user, input) {
  if (!isApprovedAdmin(user)) return { error: 'Only administrators can send announcements.' }
  const title = String(input.title || '').trim()
  const message = String(input.message || '').trim()
  const audience = String(input.audience || 'sellers')
  if (title.length < 3 || title.length > 120 || message.length < 10 || message.length > 2000) {
    return { error: 'Enter a 3-120 character title and a 10-2000 character announcement.' }
  }
  if (!audiences.has(audience)) return { error: 'Choose a valid announcement audience.' }

  const store = await readyStore()
  const sellers = audience === 'sellers' || audience === 'both'
  const deliveryPersonnel = audience === 'delivery' || audience === 'both'
  const recipients = new Map()
  for (const recipient of store.users.values()) {
    if (sellers && isApprovedSeller(recipient)) {
      recipients.set(recipient.id, '/seller/dashboard')
    }
    if (deliveryPersonnel && isApprovedDelivery(recipient)) {
      recipients.set(recipient.id, '/delivery/dashboard')
    }
  }
  for (const [recipientId, href] of recipients) {
    await notify(recipientId, title, message, href)
  }
  return { ok: true, recipientCount: recipients.size }
}
