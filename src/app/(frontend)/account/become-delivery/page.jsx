import { redirect } from 'next/navigation'
import { PartnerApplication } from '@/components/partner-application'
import { SiteShell } from '@/components/site-shell'
import { applicationsForUser } from '@/server/applications'
import { requireUser } from '@/server/guards'
import { canApplyForPartnerRole, isApprovedDelivery } from '@/server/roles'

export default async function BecomeDeliveryPage({ searchParams }) {
  const user = await requireUser('/account/become-delivery')
  if (isApprovedDelivery(user)) redirect('/delivery/dashboard')
  if (!canApplyForPartnerRole(user, 'delivery')) redirect('/')
  const query = await searchParams
  const applications = await applicationsForUser(user.id)

  return (
    <SiteShell>
      <main className="page-container page-section">
        <p className="page-eyebrow">Join the marketplace</p>
        <h1 className="page-title mt-2 text-3xl text-brand-900">Apply as a delivery partner</h1>
        <p className="page-lead mt-3 max-w-2xl text-brand-muted">Tell us where you can deliver. An administrator reviews this before delivery tools unlock.</p>
        <div className="ui-card mt-6 max-w-3xl p-5 sm:p-6">
          <PartnerApplication kind="delivery" userName={user.name} applications={applications} submitted={query.submitted === '1'} />
        </div>
      </main>
    </SiteShell>
  )
}
