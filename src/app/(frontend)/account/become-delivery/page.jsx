import { redirect } from 'next/navigation'
import { requireUser } from '@/server/guards'
import { canApplyForPartnerRole } from '@/server/roles'

export default async function BecomeDeliveryPage({ searchParams }) {
  const user = await requireUser('/account/become-delivery')
  if (user.role === 'delivery') redirect('/delivery/dashboard')
  if (!canApplyForPartnerRole(user, 'delivery')) redirect('/account')
  const query = await searchParams
  redirect(query.submitted === '1' ? '/account?apply=delivery&submitted=1' : '/account?apply=delivery')
}
