'use server'

import { redirect } from 'next/navigation'
import { currentUser } from '@/server/auth'
import { toggleWishlist } from '@/server/wishlist'

export async function toggleWishlistAction(formData) {
  const user = await currentUser()
  const productId = String(formData.get('productId') ?? '')
  const result = await toggleWishlist(user, productId)
  const destination = formData.get('returnTo') === 'wishlist' ? '/wishlist' : `/products/${productId}`
  if (result.redirectTo) redirect(result.redirectTo)
  if (result.error) redirect(`${destination}?error=${encodeURIComponent(result.error)}`)
  const message = result.saved ? 'Saved to your wishlist.' : 'Removed from your wishlist.'
  redirect(`${destination}?success=${encodeURIComponent(message)}`)
}
