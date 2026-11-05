import { save } from './sync'
import { readyStore } from './store'
import { sendPushNotifications } from './push-notifications'
import { getSupabaseAdmin } from '@/lib/supabase'

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
  const subscriptions = store.pushSubscriptions
    .filter((item) => item.userId === userId)
    .map((item) => item.subscription)
  await sendPushNotifications(subscriptions, note)
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
  const client = getSupabaseAdmin()
  if (client) {
    const { error } = await client
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .eq('user_id', userId)
    if (error) return { error: `Could not save notification state: ${error.message}` }
  }
  await save()
  return { ok: true }
}

export async function markAllNotificationsRead(userId) {
  const store = await readyStore()
  for (const note of store.notifications) {
    if (note.userId === userId) note.read = true
  }
  const client = getSupabaseAdmin()
  if (client) {
    const { error } = await client
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
    if (error) return { error: `Could not save notification state: ${error.message}` }
  }
  await save()
  return { ok: true }
}
