import { redirect } from 'next/navigation'
import { PartnerApplication } from '@/components/partner-application'
import { SiteShell } from '@/components/site-shell'
import { applicationsForUser } from '@/server/applications'
import { requireUser } from '@/server/guards'
import { canApplyForPartnerRole, isApprovedSeller } from '@/server/roles'

export default async function BecomeSellerPage({ searchParams }) {
  const user = await requireUser('/account/become-seller')
  if (isApprovedSeller(user)) redirect('/seller/dashboard')
  if (!canApplyForPartnerRole(user, 'seller')) redirect('/')
  const query = await searchParams
  const applications = await applicationsForUser(user.id)

  return (
    <SiteShell>
      <main className="page-container page-section">
        <p className="page-eyebrow">Join the marketplace</p>
        <h1 className="page-title mt-2 text-3xl text-brand-900">Apply as a seller</h1>
        <p className="page-lead mt-3 max-w-2xl text-brand-muted">Tell us about the farm. An administrator reviews this before seller tools unlock.</p>
        <div className="ui-card mt-6 max-w-3xl p-5 sm:p-6">
          <PartnerApplication kind="seller" userName={user.name} applications={applications} submitted={query.submitted === '1'} />
        </div>
      </main>
    </SiteShell>
  )
}
