import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard-shell'
import { currentUser } from '@/server/auth'
import { CartPageContent } from '@/components/cart-page-content'
import { authHref } from '@/lib/auth-links'
export default async function CartPage() {
  const user = await currentUser()
  if (!user) redirect(authHref('login', '/cart'))
  const { isApprovedBuyer } = await import('@/server/roles')
  if (!isApprovedBuyer(user)) redirect('/products')
  return (
    <DashboardShell user={user} title="Cart" subtitle="Review quantities before checkout.">
      <CartPageContent />
    </DashboardShell>
  )
}
