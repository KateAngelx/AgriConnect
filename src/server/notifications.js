import { save } from './sync'
import { readyStore } from './store'

export async function notify(userId, title, body, href) {
  if (!userId) return null
  const store = await readyStore()
  const note = {
    id: crypto.randomUUID(),
    userId,
    title,
    body,
    href: href || '',
    read: false,
    createdAt: new Date().toISOString(),
  }
  store.notifications.unshift(note)
  await save()
  return note
}

export async function listNotifications(userId) {
  const store = await readyStore()
  return store.notifications
    .filter((note) => note.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export async function unreadCount(userId) {
  const notes = await listNotifications(userId)
  return notes.filter((note) => !note.read).length
}

export async function markNotificationRead(id, userId) {
  const store = await readyStore()
  const note = store.notifications.find((item) => item.id === id && item.userId === userId)
  if (!note) return { error: 'Notification not found.' }
  note.read = true
  await save()
  return { ok: true }
}

export async function markAllNotificationsRead(userId) {
  const store = await readyStore()
  for (const note of store.notifications) {
    if (note.userId === userId) note.read = true
  }
  await save()
  return { ok: true }
}
