import { currentUser } from '@/server/auth'
import { unreadCount } from '@/server/notifications'
import { PublicShell } from './public-shell'

export async function SiteShell({ children, user: providedUser }) {
  const user = providedUser === undefined ? await currentUser() : providedUser
  const unread = user ? await unreadCount(user.id) : 0
  return (
    <PublicShell user={user} unread={unread}>
      {children}
    </PublicShell>
  )
}
