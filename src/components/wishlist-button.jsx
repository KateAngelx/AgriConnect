'use client'

import { useWishlistState } from './marketplace-state'
import { DashboardIcon } from './dashboard-icons'

export function WishlistButton({ product, className = 'btn btn-secondary', iconOnly = false }) {
  const { wishlist, wishlistBusy, wishlistLoading, setWishlistItem } = useWishlistState()
  const saved = wishlist.some((item) => item.productId === product.id)

  return (
    <button
      type="button"
      className={className}
      disabled={wishlistBusy || wishlistLoading}
      aria-busy={wishlistLoading || wishlistBusy || undefined}
      aria-pressed={saved}
      aria-label={iconOnly ? `Remove ${product.name || 'product'} from wishlist` : undefined}
      title={iconOnly ? (wishlistLoading ? 'Loading wishlist' : 'Remove from wishlist') : undefined}
      onClick={() => setWishlistItem(product, !saved)}
    >
      {wishlistLoading ? (
        'Loading…'
      ) : wishlistBusy ? (
        'Updating…'
      ) : iconOnly ? (
        <DashboardIcon name="trash" className="size-4" />
      ) : saved ? (
        'Remove from wishlist'
      ) : (
        'Save to wishlist'
      )}
    </button>
  )
}
