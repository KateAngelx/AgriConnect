import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard-shell'
import { CheckoutForm } from '@/components/checkout-form'
import { DELIVERY_FEE, electronicPaymentConfiguredSafely, electronicPaymentProvider } from '@/server/payments'
import { currentUser } from '@/server/auth'
import { checkoutSummaryForBuyer } from '@/server/checkout-summary'
export default async function CheckoutPage() {
  const user = await currentUser()
  if (!user) redirect('/login')
  const { isApprovedBuyer } = await import('@/server/roles')
  if (!isApprovedBuyer(user)) redirect('/products')
  const summary = await checkoutSummaryForBuyer(user.id)
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
