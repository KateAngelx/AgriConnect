import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard-shell'
import { PrimaryLink, SecondaryButton, WorkSection, workStackClass } from '@/components/dashboard-ui'
import { PagedRows } from '@/components/paged-rows'
import { peso } from '@/lib/dashboard-format'
import { currentUser } from '@/server/auth'
import { listWishlist } from '@/server/wishlist'
import { toggleWishlistAction } from '@/app/(frontend)/wishlist/actions'
import { DashboardIcon } from '@/components/dashboard-icons'
import { authHref } from '@/lib/auth-links'
import { addToCartAction } from '@/app/(frontend)/cart/actions'

export default async function WishlistPage() {
  const user = await currentUser()
  if (!user) redirect(authHref('login', '/wishlist'))
  const { isApprovedBuyer } = await import('@/server/roles')
  if (!isApprovedBuyer(user)) redirect('/account')
  const items = await listWishlist(user.id)

  return (
    <DashboardShell user={user} title="Wishlist" subtitle="Products you saved to order later.">
      <div className="mb-4 flex justify-end">
        <PrimaryLink href="/products">Browse</PrimaryLink>
      </div>
      <div className={workStackClass}>
        <WorkSection
          title="Saved products"
          description="Items you kept to order later."
          count={items.length}
          empty={<p className="text-sm text-[#5c6f62]">Save a product from its page to keep it here.</p>}
        >
          <PagedRows>
            {items.map((item) => {
              const product = item.product
              const available = product?.status === 'active' && product.seller?.status === 'approved'
              const inStock = available && product.stock > 0
              return (
                <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  {product ? (
                    <>
                      <div className="min-w-0 flex-1">
                        {available ? (
                          <Link href={`/products/${product.id}`} className="font-semibold text-[#142016] hover:text-[#4b9f30]">
                            {product.name}
                          </Link>
                        ) : (
                          <p className="font-semibold text-[#142016]">{product.name}</p>
                        )}
                        <p className="text-[13px] text-[#5c6f62]">{peso(product.price)} per {product.unit}</p>
                        <p className={`text-xs font-semibold ${inStock ? 'text-[#248a3d]' : 'text-[#963b2d]'}`}>
                          {!available ? 'Unavailable' : inStock ? `${product.stock} in stock` : 'Out of stock'}
                        </p>
                      </div>
                      {inStock ? (
                        <form action={addToCartAction}>
                          <input type="hidden" name="productID" value={product.id} />
                          <input type="hidden" name="quantity" value="1" />
                          <input type="hidden" name="returnTo" value="/wishlist" />
                          <SecondaryButton type="submit">Add to cart</SecondaryButton>
                        </form>
                      ) : null}
                    </>
                  ) : (
                    <p className="flex-1 text-sm text-[#963b2d]">This product is no longer available.</p>
                  )}
                  <form action={toggleWishlistAction}>
                    <input type="hidden" name="productId" value={item.productId} />
                    <input type="hidden" name="returnTo" value="wishlist" />
                    <SecondaryButton
                      type="submit"
                      className="!size-9 !min-h-9 !p-0 text-[#963b2d]"
                      aria-label={`Remove ${product?.name || 'unavailable product'} from wishlist`}
                      title="Remove from wishlist"
                    >
                      <DashboardIcon name="trash" className="size-4" />
                    </SecondaryButton>
                  </form>
                </li>
              )
            })}
          </PagedRows>
        </WorkSection>
      </div>
    </DashboardShell>
  )
}
