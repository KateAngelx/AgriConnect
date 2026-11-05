import { unreadCount } from '@/server/notifications'
import { adminSnapshot } from '@/server/admin'
import { deliverySnapshot } from '@/server/delivery'
import { sellerSnapshot } from '@/server/seller'
import { DashboardFrame } from './dashboard-frame'

export { peso, pretty, formatTimeAgo, greetingName } from '@/lib/dashboard-format'

async function resolveNavBadges(user, navBadges) {
  if (navBadges) return navBadges
  if (user.role === 'admin') {
    const summary = await adminSnapshot()
    return { '/admin/applications': summary.pending }
  }
  if (user.role === 'seller') {
    const summary = await sellerSnapshot(user)
    return summary.openOrders > 0 ? { '/seller/orders': summary.openOrders } : {}
  }
  if (user.role === 'delivery') {
    const summary = await deliverySnapshot(user)
    return summary.open > 0 ? { '/delivery/dashboard': summary.open } : {}
  }
  return {}
}

export async function DashboardShell({
  user,
  title,
  subtitle,
  children,
  variant = 'default',
  navBadges,
}) {
  const [unread, badges] = await Promise.all([
    unreadCount(user.id),
    resolveNavBadges(user, navBadges),
  ])
  return (
    <DashboardFrame
      user={user}
      title={title}
      subtitle={subtitle}
      unread={unread}
      navBadges={badges}
      variant={variant}
    >
      {children}
    </DashboardFrame>
  )
}
