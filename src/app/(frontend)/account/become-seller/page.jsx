import { redirect } from 'next/navigation'
import { requireUser } from '@/server/guards'
import { canApplyForPartnerRole } from '@/server/roles'

export default async function BecomeSellerPage({ searchParams }) {
  const user = await requireUser('/account/become-seller')
  if (user.role === 'seller') redirect('/seller/dashboard')
  if (!canApplyForPartnerRole(user, 'seller')) redirect('/account')
  const query = await searchParams
  redirect(query.submitted === '1' ? '/account?apply=seller&submitted=1' : '/account?apply=seller')
}
