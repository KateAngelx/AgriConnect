import { unreadCount } from '@/server/notifications'
import { adminSnapshot } from '@/server/admin'
import { getCart } from '@/server/cart'
import { deliverySnapshot } from '@/server/delivery'
import { sellerSnapshot } from '@/server/seller'
import { listWishlist } from '@/server/wishlist'
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
  let cartCount = 0
  let wishlistCount = 0
  if ((user.roles?.includes('buyer') || user.role === 'buyer') && user.status === 'approved') {
    const [cart, wishlist] = await Promise.all([getCart(user.id), listWishlist(user.id)])
    cartCount = cart?.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) ?? 0
    wishlistCount = wishlist.length
  }
  return (
    <DashboardFrame
      user={user}
      title={title}
      subtitle={subtitle}
      unread={unread}
      cartCount={cartCount}
      wishlistCount={wishlistCount}
      navBadges={badges}
      variant={variant}
    >
      {children}
    </DashboardFrame>
  )
}
