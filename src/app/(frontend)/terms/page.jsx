import { ContentPage } from '@/components/content-page'
export default function TermsPage() {
  return (
    <ContentPage
      eyebrow="Marketplace terms"
      title="Responsibilities for using AgriConnect."
      intro="These terms summarize the intended marketplace rules and must evolve alongside the implemented payment, refund, and delivery workflows."
      sections={[
        {
          title: 'Account responsibility',
          body: 'Users must provide accurate account information, protect their credentials, and use only the role and records they are authorized to access.',
        },
        {
          title: 'Seller responsibility',
          body: 'Sellers are responsible for accurate listings, lawful products, current prices and stock, fulfillment details, and timely order updates.',
        },
        {
          title: 'Buyer responsibility',
          body: 'Buyers must review product units, quantities, fulfillment options, totals, and payment status before confirming an order.',
        },
        {
          title: 'Payments and refunds',
          body: 'Only payment methods shown as configured at checkout should be considered available. Refund eligibility and processing depend on the recorded order and provider status.',
        },
        {
          title: 'Pickup and delivery',
          body: 'Users must follow confirmed pickup instructions or provide accurate delivery information. Delivery tracking reflects recorded workflow events, not continuous location tracking unless explicitly implemented.',
        },
        {
          title: 'Suspension and review',
          body: 'Accounts may be reviewed, restricted, or suspended for inaccurate applications, misuse, fraud concerns, safety issues, or material marketplace policy violations.',
        },
      ]}
    />
  )
}
