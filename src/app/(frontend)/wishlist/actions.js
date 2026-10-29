'use server'

import { redirect } from 'next/navigation'
import { currentUser } from '@/server/auth'
import { toggleWishlist } from '@/server/wishlist'

export async function toggleWishlistAction(formData) {
  const user = await currentUser()
  const productId = String(formData.get('productId') ?? '')
  const result = await toggleWishlist(user, productId)
  if (result.redirectTo) redirect(result.redirectTo)
  if (result.error) redirect(`/products/${productId}?error=${encodeURIComponent(result.error)}`)
  redirect(formData.get('returnTo') === 'wishlist' ? '/wishlist' : `/products/${productId}`)
}
