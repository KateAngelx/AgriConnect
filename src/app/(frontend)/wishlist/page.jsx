import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard-shell'
import { EmptyState, ListRow, PrimaryButton, SecondaryButton } from '@/components/dashboard-ui'
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
    <DashboardShell user={user} title="Wishlist" subtitle="Products you saved for later.">
      {items.length ? (
        <ul className="space-y-3">
          {items.map((item) => (
            <ListRow
              key={item.id}
              title={
                <Link href={`/products/${item.product.id}`} className="hover:text-[#4b9f30]">
                  {item.product.name}
                </Link>
              }
              meta={`${peso(item.product.price)} per ${item.product.unit}`}
              actions={
                <form action={toggleWishlistAction}>
                  <input type="hidden" name="productId" value={item.product.id} />
                  <input type="hidden" name="returnTo" value="wishlist" />
                  <SecondaryButton type="submit">Remove</SecondaryButton>
                </form>
              }
            />
          ))}
        </ul>
      ) : (
        <EmptyState
          title="Nothing saved yet"
          action={
            <Link href="/products">
              <PrimaryButton type="button">Browse products</PrimaryButton>
            </Link>
          }
        >
          Tap save on any product to add it here.
        </EmptyState>
      )}
    </DashboardShell>
  )
}
