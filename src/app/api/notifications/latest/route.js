import { currentUser } from '@/server/auth'
import { latestUnreadNotification } from '@/server/notifications'

export async function GET() {
  const user = await currentUser()
  if (!user) return Response.json({ error: 'Login required.' }, { status: 401 })
  const unread = await latestUnreadNotification(user.id)
  return Response.json(unread || {})
}
