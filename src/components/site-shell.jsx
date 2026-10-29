import { currentUser } from '@/server/auth'
import { getCart } from '@/server/cart'
import { unreadCount } from '@/server/notifications'
import { listWishlist } from '@/server/wishlist'
import { PublicShell } from './public-shell'

export async function SiteShell({ children }) {
  const user = await currentUser()
  const unread = user ? await unreadCount(user.id) : 0
  let cartCount = 0
  let wishlistCount = 0
  if ((user?.roles?.includes('buyer') || user?.role === 'buyer') && user.status === 'approved') {
    const [cart, wishlist] = await Promise.all([getCart(user.id), listWishlist(user.id)])
    cartCount = cart?.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) ?? 0
    wishlistCount = wishlist.length
  }
  return (
    <PublicShell user={user} unread={unread} cartCount={cartCount} wishlistCount={wishlistCount}>
      {children}
    </PublicShell>
  )
}
