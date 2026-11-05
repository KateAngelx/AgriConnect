import { currentUser } from '@/server/auth'
import { unreadCount } from '@/server/notifications'
import { PublicShell } from './public-shell'

export async function SiteShell({ children }) {
  const user = await currentUser()
  const unread = user ? await unreadCount(user.id) : 0
  return (
    <PublicShell user={user} unread={unread}>
      {children}
    </PublicShell>
  )
}
