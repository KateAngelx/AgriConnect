import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard-shell'
import { AlertBanner, DashboardPanel, StatusBadge } from '@/components/dashboard-ui'
import { DeliveryApplicationForm } from '@/components/apply-forms'
import { applicationsForUser } from '@/server/applications'
import { requireUser } from '@/server/guards'

export default async function BecomeDeliveryPage({ searchParams }) {
  const user = await requireUser('/account/become-delivery')
  if (user.role === 'delivery') redirect('/delivery/dashboard')
  const { canApplyForPartnerRole } = await import('@/server/roles')
  if (!canApplyForPartnerRole(user, 'delivery')) redirect('/account')

  const query = await searchParams
  const applications = await applicationsForUser(user.id)
  const deliveryApps = applications.filter((item) => item.applicationType === 'delivery')
  const active = deliveryApps.find((item) => ['pending', 'under-review'].includes(item.status))
  const needsInfo = deliveryApps.find((item) => item.status === 'needs-info')
  const draft = deliveryApps.find((item) => item.status === 'draft')
  const latest = deliveryApps[0]

  return (
    <DashboardShell
      user={user}
      title="Become a delivery partner"
      subtitle="Apply to deliver orders for AgriConnect buyers and sellers."
    >
      {query.submitted === '1' ? (
        <div className="mb-6">
          <AlertBanner tone="success">
            Your delivery application was submitted. An administrator will review it before delivery tools unlock.
            You will receive a notification when the status changes.
          </AlertBanner>
        </div>
      ) : null}

      {active ? (
        <DashboardPanel title="Application status">
          <StatusBadge status={active.status} />
          <p className="mt-3 text-sm leading-6 text-[#65766d]">
            Your application is {active.status.replaceAll('-', ' ')}. You cannot submit another delivery
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
            <DeliveryApplicationForm defaultName={user.name} draft={needsInfo.payload} />
          </DashboardPanel>
        </div>
      ) : latest?.status === 'rejected' ? (
        <div className="mb-6 space-y-4">
          <AlertBanner tone="error">
            Your previous delivery application was rejected.
            {latest.adminNote ? ` Note: ${latest.adminNote}` : ' You may submit a new application below.'}
          </AlertBanner>
          <DashboardPanel title="New delivery application">
            <DeliveryApplicationForm defaultName={user.name} draft={draft?.payload} />
          </DashboardPanel>
        </div>
      ) : (
        <DashboardPanel
          title="Delivery partner application"
          description="No sensitive documents are required at this stage. Use Save draft if you need to finish later."
        >
          <DeliveryApplicationForm defaultName={user.name} draft={draft?.payload} />
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
