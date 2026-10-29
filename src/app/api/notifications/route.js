import { currentUser } from '@/server/auth'
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '@/server/notifications'

export async function GET() {
  const user = await currentUser()
  if (!user) return Response.json({ error: 'Sign in required.' }, { status: 401 })
  const notifications = await listNotifications(user.id)
  const unread = notifications.filter((note) => !note.read).length
  return Response.json({ notifications, unread })
}

export async function PATCH(request) {
  const user = await currentUser()
  if (!user) return Response.json({ error: 'Sign in required.' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  if (body.all) {
    const result = await markAllNotificationsRead(user.id)
    return Response.json(result, { status: result.error ? 400 : 200 })
  }
  const result = await markNotificationRead(String(body.id ?? ''), user.id)
  return Response.json(result, { status: result.error ? 400 : 200 })
}
