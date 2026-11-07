'use client'

import Link from 'next/link'
import { useWishlistState } from './marketplace-state'
import { WishlistButton } from './wishlist-button'
import { DashboardIcon } from './dashboard-icons'
import { peso } from '@/lib/dashboard-format'
import { PagedRows } from './paged-rows'

export function WishlistItems() {
  const { wishlist, wishlistLoading, wishlistError, refreshWishlist, addToCart, cartBusy } =
    useWishlistState()

  if (wishlistLoading) {
    return (
      <p role="status" className="text-sm text-[#5c6f62]">
        Loading saved products…
      </p>
    )
  }

  if (wishlistError) {
    return (
      <div role="alert" className="text-sm text-[#963b2d]">
        <p>{wishlistError}</p>
        <button type="button" onClick={refreshWishlist} className="btn btn-secondary mt-3">
          Try again
        </button>
      </div>
    )
  }

  if (!wishlist.length) {
    return <p className="text-sm text-[#5c6f62]">Save a product from its page to keep it here.</p>
  }

  return (
    <PagedRows>
      {wishlist.map((item) => {
        const product = item.product
        const available = product?.status === 'active' && product.seller?.status === 'approved'
        const inStock = available && product.stock > 0
        return (
          <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
            {product ? (
              <>
                <div className="min-w-0 flex-1">
                  {available ? (
                    <Link
                      href={`/products/${product.id}`}
                      className="font-semibold text-[#142016] hover:text-[#4b9f30]"
                    >
                      {product.name}
                    </Link>
                  ) : (
                    <p className="font-semibold text-[#142016]">{product.name}</p>
                  )}
                  <p className="text-[13px] text-[#5c6f62]">
                    {peso(product.price)} per {product.unit}
                  </p>
                  <p
                    className={`text-xs font-semibold ${inStock ? 'text-[#248a3d]' : 'text-[#963b2d]'}`}
                  >
                    {!available
                      ? 'Unavailable'
                      : inStock
                        ? `${product.stock} in stock`
                        : 'Out of stock'}
                  </p>
                </div>
                {inStock ? (
                  <button
                    type="button"
                    disabled={cartBusy}
                    onClick={() => addToCart(product, 1)}
                    className="btn btn-secondary"
                  >
                    {cartBusy ? 'Adding…' : 'Add to cart'}
                  </button>
                ) : null}
              </>
            ) : (
              <p className="flex-1 text-sm text-[#963b2d]">This product is no longer available.</p>
            )}
            <WishlistButton
              product={product || { id: item.productId, name: 'unavailable product' }}
              className="grid size-9 shrink-0 place-items-center rounded-lg border border-red-200 text-[#963b2d] hover:bg-red-50 disabled:opacity-50"
              iconOnly
            />
          </li>
        )
      })}
    </PagedRows>
  )
}
