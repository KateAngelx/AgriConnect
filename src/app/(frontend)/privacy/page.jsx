import { ContentPage } from '@/components/content-page'
export default function PrivacyPage() {
  return (
    <ContentPage
      eyebrow="Privacy policy"
      title="How AgriConnect handles marketplace information."
      intro="This policy describes the platform’s current data practices. It does not claim unverified certifications or legal compliance."
      sections={[
        {
          title: 'Information collected',
          body: 'Account details, role applications, seller information, delivery information, addresses, orders, support messages, notifications, and necessary transaction references may be stored when those features are used.',
        },
        {
          title: 'Why information is used',
          body: 'Information supports authentication, account review, listing management, order fulfillment, customer support, platform safety, and authorized marketplace reporting.',
        },
        {
          title: 'Access and visibility',
          body: 'Public pages show only approved seller information and active product details. Private account, order, application, and operational records are restricted by role and ownership.',
        },
        {
          title: 'Documents and sensitive data',
          body: 'Verification documents and private contact details are not displayed publicly. Payment credentials and AI provider secrets must remain in protected server-side configuration.',
        },
        {
          title: 'Account choices',
          body: 'Users may update permitted profile information and request support for account concerns. Protected roles and approval statuses cannot be changed by users themselves.',
        },
        {
          title: 'Privacy concerns',
          body: 'Use the Contact page for questions about stored information or marketplace privacy practices.',
        },
      ]}
    />
  )
}
