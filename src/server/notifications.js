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
  try {
    await save()
  } catch (error) {
    store.notifications = store.notifications.filter((item) => item.id !== note.id)
    throw error
  }
  const subscriptions = store.pushSubscriptions
    .filter((item) => item.userId === userId)
    .map((item) => item.subscription)
  await sendPushNotifications(subscriptions, note)
  return note
}

export async function listNotifications(userId) {
  const store = await readyStore()
  const client = getSupabaseAdmin()
  if (client) {
    const { data, error } = await client
      .from('notifications')
      .select('id, user_id, title, body, href, read, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw new Error(`Could not load notifications: ${error.message}`)
    const notes = (data || []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      title: row.title,
      body: row.body || '',
      href: row.href || '',
      read: Boolean(row.read),
      createdAt: row.created_at,
    }))
    store.notifications = [
      ...store.notifications.filter((note) => note.userId !== userId),
      ...notes,
    ]
    return notes
  }
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
  const client = getSupabaseAdmin()
  if (client) {
    const { data, error } = await client
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .eq('user_id', userId)
      .select('id')
      .maybeSingle()
    if (error) return { error: `Could not save notification state: ${error.message}` }
    if (!data) return { error: 'Notification not found.' }
  } else if (!store.notifications.some((item) => item.id === id && item.userId === userId)) {
    return { error: 'Notification not found.' }
  }
  const note = store.notifications.find((item) => item.id === id && item.userId === userId)
  if (note) note.read = true
  if (!client) await save()
  return { ok: true }
}

export async function markAllNotificationsRead(userId) {
  const store = await readyStore()
  const client = getSupabaseAdmin()
  if (client) {
    const { error } = await client
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
    if (error) return { error: `Could not save notification state: ${error.message}` }
  }
  for (const note of store.notifications) {
    if (note.userId === userId) note.read = true
  }
  if (!client) await save()
  return { ok: true }
}
