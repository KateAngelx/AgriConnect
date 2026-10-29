import { ContentPage } from '@/components/content-page'
export default function HowItWorksPage() {
  return (
    <ContentPage
      eyebrow="Simple, accountable workflows"
      title="How AgriConnect works for every marketplace role."
      intro="The platform connects discovery, ordering, inventory, delivery, and account review through one shared system."
      sections={[
        {
          title: 'For buyers',
          body: 'Create an account and shop with confidence.',
          points: [
            'Browse active agricultural products',
            'Compare prices, units, sellers, and locations',
            'Add available products to your cart',
            'Choose pickup or supported delivery',
            'Confirm an available payment method',
            'Track the order through completion',
          ],
        },
        {
          title: 'For farmers and sellers',
          body: 'Seller tools become available only after account approval.',
          points: [
            'Register and submit required information',
            'Wait for administrator review',
            'Create product listings and manage stock',
            'Confirm and prepare incoming orders',
            'Coordinate pickup or delivery',
            'Review completed sales and actual earnings',
          ],
        },
        {
          title: 'For delivery personnel',
          body: 'Only approved personnel can receive eligible assignments.',
          points: [
            'Register and submit requirements',
            'Wait for account approval',
            'Accept one controlled assignment',
            'Collect the prepared order',
            'Update delivery milestones',
            'Record completion, commissions, and remittances',
          ],
        },
        {
          title: 'For administrators',
          body: 'Administrators review applications and essential marketplace operations. They do not replace sellers in routine inventory or fulfillment work.',
        },
      ]}
    />
  )
}
