'use client'

import { useMarketplaceState } from './marketplace-state'
import { DashboardIcon } from './dashboard-icons'

export function WishlistButton({ product, className = 'btn btn-secondary', iconOnly = false }) {
  const { wishlist, wishlistBusy, setWishlistItem } = useMarketplaceState()
  const saved = wishlist.some((item) => item.productId === product.id)

  return (
    <button
      type="button"
      className={className}
      disabled={wishlistBusy}
      aria-pressed={saved}
      aria-label={iconOnly ? `Remove ${product.name || 'product'} from wishlist` : undefined}
      title={iconOnly ? 'Remove from wishlist' : undefined}
      onClick={() => setWishlistItem(product, !saved)}
    >
      {wishlistBusy
        ? 'Updating…'
        : iconOnly
          ? <DashboardIcon name="trash" className="size-4" />
          : saved
            ? 'Remove from wishlist'
            : 'Save to wishlist'}
    </button>
  )
}
