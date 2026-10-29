import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard-shell'
import { AlertBanner, DashboardPanel, StatusBadge } from '@/components/dashboard-ui'
import { SellerApplicationForm } from '@/components/apply-forms'
import { applicationsForUser } from '@/server/applications'
import { requireUser } from '@/server/guards'

export default async function BecomeSellerPage({ searchParams }) {
  const user = await requireUser('/account/become-seller')
  if (user.role === 'seller') redirect('/seller/dashboard')
  const { canApplyForPartnerRole } = await import('@/server/roles')
  if (!canApplyForPartnerRole(user, 'seller')) redirect('/account')

  const query = await searchParams
  const applications = await applicationsForUser(user.id)
  const sellerApps = applications.filter((item) => item.applicationType === 'seller')
  const active = sellerApps.find((item) => ['pending', 'under-review'].includes(item.status))
  const needsInfo = sellerApps.find((item) => item.status === 'needs-info')
  const draft = sellerApps.find((item) => item.status === 'draft')
  const latest = sellerApps[0]

  return (
    <DashboardShell
      user={user}
      title="Become a seller"
      subtitle="Apply to list agricultural products on AgriConnect. Your progress can be saved as a draft."
    >
      {query.submitted === '1' ? (
        <div className="mb-6">
          <AlertBanner tone="success">
            Your seller application was submitted. An administrator will review it before seller tools unlock.
            You will receive a notification when the status changes.
          </AlertBanner>
        </div>
      ) : null}

      {active ? (
        <DashboardPanel title="Application status">
          <StatusBadge status={active.status} />
          <p className="mt-3 text-sm leading-6 text-[#65766d]">
            Your application is {active.status.replaceAll('-', ' ')}. You cannot submit another seller
            application until this one is approved or rejected.
          </p>
          {active.adminNote ? (
            <p className="mt-3 rounded-xl bg-[#f7f7f2] px-4 py-3 text-sm text-[#647066]">{active.adminNote}</p>
          ) : null}
        </DashboardPanel>
      ) : needsInfo ? (
        <div className="space-y-4">
          <AlertBanner tone="warning">
            Additional information is required before your application can continue.
            {needsInfo.adminNote ? ` ${needsInfo.adminNote}` : ''}
          </AlertBanner>
          <DashboardPanel title="Update your application">
            <SellerApplicationForm defaultName={user.name} draft={needsInfo.payload} />
          </DashboardPanel>
        </div>
      ) : latest?.status === 'rejected' ? (
        <div className="mb-6 space-y-4">
          <AlertBanner tone="error">
            Your previous seller application was rejected.
            {latest.adminNote ? ` Note: ${latest.adminNote}` : ' You may submit a new application below.'}
          </AlertBanner>
          <DashboardPanel title="New seller application">
            <SellerApplicationForm defaultName={user.name} draft={draft?.payload} />
          </DashboardPanel>
        </div>
      ) : (
        <DashboardPanel
          title="Seller application"
          description="We only collect basic business details at this stage. Use Save draft if you need to finish later."
        >
          <SellerApplicationForm defaultName={user.name} draft={draft?.payload} />
        </DashboardPanel>
      )}

      <p className="mt-6 text-sm text-[#647066]">
        <Link href="/account" className="font-bold text-[#4b9f30]">
          ← Back to my account
        </Link>
      </p>
    </DashboardShell>
  )
}
