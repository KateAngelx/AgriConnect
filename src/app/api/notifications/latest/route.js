import { currentUser } from '@/server/auth'
import { listNotifications } from '@/server/notifications'

export async function GET() {
  const user = await currentUser()
  if (!user) return Response.json({ error: 'Login required.' }, { status: 401 })
  const notes = await listNotifications(user.id)
  const unread = notes.find((note) => !note.read)
  return Response.json(unread || {})
}
