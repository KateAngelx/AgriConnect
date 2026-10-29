import { ContentPage } from '@/components/content-page'
export default function AboutPage() {
  return (
    <ContentPage
      eyebrow="Our mission"
      title="A more direct connection between Filipino farms and households."
      intro="AgriConnect is being built as a transparent agricultural marketplace where approved sellers can offer produce and buyers can make informed purchasing decisions."
      sections={[
        {
          title: 'The problem',
          body: 'Agricultural products can pass through fragmented channels that make availability, origin, and pricing difficult for buyers to understand. Farmers also need practical ways to reach customers online.',
        },
        {
          title: 'For farmers',
          body: 'Approved sellers receive a dedicated shop, inventory tools, order management, and clear records of completed and pending earnings.',
        },
        {
          title: 'For buyers',
          body: 'Buyers can compare active products, seller locations, units, stock, prices, and supported fulfillment methods before placing an order.',
        },
        {
          title: 'Pickup and delivery',
          body: 'Listings identify the fulfillment methods a seller supports. Delivery options and fees must be confirmed from real marketplace records before checkout.',
        },
        {
          title: 'Our direction',
          body: 'The platform is being developed in stages, prioritizing secure accounts, accurate inventory, connected ordering, and accountable fulfillment before advanced automation.',
        },
        {
          title: 'Credible by design',
          body: 'AgriConnect does not publish invented impact figures, prices, testimonials, payment methods, or delivery coverage. Marketplace claims should remain traceable to actual records.',
        },
      ]}
    />
  )
}
