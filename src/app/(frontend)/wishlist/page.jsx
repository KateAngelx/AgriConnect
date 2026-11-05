import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard-shell'
import { PrimaryLink, WorkSection, workStackClass } from '@/components/dashboard-ui'
import { currentUser } from '@/server/auth'
import { WishlistItems } from '@/components/wishlist-items'
import { authHref } from '@/lib/auth-links'

export default async function WishlistPage() {
  const user = await currentUser()
  if (!user) redirect(authHref('login', '/wishlist'))
  const { isApprovedBuyer } = await import('@/server/roles')
  if (!isApprovedBuyer(user)) redirect('/account')
  return (
    <DashboardShell user={user} title="Wishlist" subtitle="Products you saved to order later.">
      <div className="mb-4 flex justify-end">
        <PrimaryLink href="/products">Browse</PrimaryLink>
      </div>
      <div className={workStackClass}>
        <WorkSection
          title="Saved products"
          description="Items you kept to order later."
        >
          <WishlistItems />
        </WorkSection>
      </div>
    </DashboardShell>
  )
}
