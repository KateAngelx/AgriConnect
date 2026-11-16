import { notify } from './notifications'
import { isApprovedAdmin, isApprovedDelivery, isApprovedSeller } from './roles'
import { save } from './sync'
import { freshStore } from './store'

const audiences = new Set(['sellers', 'delivery', 'both'])
// Sent announcements are kept in platform_settings under this key (newest first),
// so admins have a history and sellers/couriers see them on their dashboards.
const HISTORY_KEY = 'announcements'
const HISTORY_LIMIT = 100

export const audienceLabel = {
  sellers: 'Approved sellers',
  delivery: 'Approved delivery personnel',
  both: 'Sellers and delivery personnel',
}

function history(store) {
  const list = store.settings?.[HISTORY_KEY]
  return Array.isArray(list) ? list : []
}

export async function publishAdminAnnouncement(user, input) {
  if (!isApprovedAdmin(user)) return { error: 'Only administrators can send announcements.' }
  const title = String(input.title || '').trim()
  const message = String(input.message || '').trim()
  const audience = String(input.audience || 'sellers')
  if (title.length < 3 || title.length > 120 || message.length < 10 || message.length > 2000) {
    return { error: 'Enter a 3-120 character title and a 10-2000 character announcement.' }
  }
  if (!audiences.has(audience)) return { error: 'Choose a valid announcement audience.' }

  // Fresh copy so sellers and couriers approved on another server are included.
  const store = await freshStore(0)
  const sellers = audience === 'sellers' || audience === 'both'
  const deliveryPersonnel = audience === 'delivery' || audience === 'both'
  const recipients = new Map()
  for (const recipient of store.users.values()) {
    if (sellers && isApprovedSeller(recipient)) recipients.set(recipient.id, '/seller/dashboard')
    if (deliveryPersonnel && isApprovedDelivery(recipient)) recipients.set(recipient.id, '/delivery/dashboard')
  }

  store.settings ??= {}
  store.settings[HISTORY_KEY] = [
    {
      id: crypto.randomUUID(),
      title,
      message,
      audience,
      recipientCount: recipients.size,
      sentBy: user.name || 'Administrator',
      sentAt: new Date().toISOString(),
    },
    ...history(store),
  ].slice(0, HISTORY_LIMIT)
  await save()

  for (const [recipientId, href] of recipients) {
    await notify(recipientId, title, message, href)
  }
  return { ok: true, recipientCount: recipients.size }
}

/** Every sent announcement, newest first (admin). */
export async function listAnnouncements() {
  const store = await freshStore()
  return history(store)
}

/** Announcements addressed to this seller and/or courier, newest first. */
export async function announcementsFor(user) {
  const store = await freshStore()
  const seller = isApprovedSeller(user)
  const courier = isApprovedDelivery(user)
  return history(store).filter(
    (item) =>
      item.audience === 'both' ? seller || courier : item.audience === 'sellers' ? seller : courier,
  )
}
