import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard-shell'
import { CheckoutForm } from '@/components/checkout-form'
import { DELIVERY_FEE, electronicPaymentConfiguredSafely, electronicPaymentProvider } from '@/server/payments'
import { currentUser } from '@/server/auth'
import { checkoutSummaryForBuyer } from '@/server/checkout-summary'
import { authHref } from '@/lib/auth-links'
export default async function CheckoutPage({ searchParams }) {
  const user = await currentUser()
  if (!user) redirect(authHref('login', '/checkout'))
  const { isApprovedBuyer } = await import('@/server/roles')
  if (!isApprovedBuyer(user)) redirect('/products')
  const query = await searchParams
  const selectedCartItemIds = typeof query.cartItemIds === 'string'
    ? query.cartItemIds.split(',').map((id) => id.trim()).filter(Boolean)
    : []
  if (!selectedCartItemIds.length) redirect('/cart?error=Select%20at%20least%20one%20cart%20item%20before%20checkout.')
  const summary = await checkoutSummaryForBuyer(user.id, selectedCartItemIds)
  if (summary.unavailableItems.length) redirect('/cart?error=Update%20unavailable%20or%20out-of-stock%20cart%20items%20before%20checkout.')
  if (!summary.items.length) redirect('/cart')
  const electronicPayments = await electronicPaymentConfiguredSafely()
  const electronicProvider = electronicPaymentProvider()

  return (
    <DashboardShell
      user={user}
      title="Checkout"
      subtitle="Choose pickup or delivery, then how you will pay."
    >
      <CheckoutForm
        user={user}
        summary={summary}
        electronicPayments={electronicPayments}
        electronicProvider={electronicProvider}
        deliveryFee={DELIVERY_FEE}
      />
    </DashboardShell>
  )
}
