import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard-shell'
import { PrimaryLink, SecondaryButton, WorkSection, workStackClass } from '@/components/dashboard-ui'
import { PagedRows } from '@/components/paged-rows'
import { peso } from '@/lib/dashboard-format'
import { currentUser } from '@/server/auth'
import { listWishlist } from '@/server/wishlist'
import { toggleWishlistAction } from '@/app/(frontend)/wishlist/actions'

export default async function WishlistPage() {
  const user = await currentUser()
  if (!user) redirect('/login')
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
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <Link href={`/products/${item.product.id}`} className="font-semibold text-[#142016] hover:text-[#4b9f30]">
                    {item.product.name}
                  </Link>
                  <p className="text-[13px] text-[#5c6f62]">{peso(item.product.price)} per {item.product.unit}</p>
                </div>
                <form action={toggleWishlistAction}>
                  <input type="hidden" name="productId" value={item.product.id} />
                  <input type="hidden" name="returnTo" value="wishlist" />
                  <SecondaryButton type="submit">Remove</SecondaryButton>
                </form>
              </li>
            ))}
          </PagedRows>
        </WorkSection>
      </div>
    </DashboardShell>
  )
}
