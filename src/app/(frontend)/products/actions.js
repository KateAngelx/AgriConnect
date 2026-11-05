'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { authHref } from '@/lib/auth-links'
import { currentUser } from '@/server/auth'
import { deleteBuyerReview, saveBuyerReview } from '@/server/reviews'

function productPath(productId) {
  return `/products/${encodeURIComponent(String(productId || ''))}`
}

function noticePath(path, key, message) {
  return `${path}?${key}=${encodeURIComponent(message)}#reviews`
}

export async function saveProductReviewAction(formData) {
  const productId = String(formData.get('productId') || '')
  const path = productPath(productId)
  const user = await currentUser()
  if (!user) redirect(authHref('login', path))
  const result = await saveBuyerReview(user, {
    productId,
    rating: formData.get('rating'),
    body: formData.get('body'),
  })
  if (result.error) redirect(noticePath(path, 'error', result.error))
  revalidatePath(path)
  revalidatePath('/products')
  redirect(noticePath(path, 'success', 'Your product review has been saved.'))
}

export async function deleteProductReviewAction(formData) {
  const productId = String(formData.get('productId') || '')
  const path = productPath(productId)
  const user = await currentUser()
  if (!user) redirect(authHref('login', path))
  const result = await deleteBuyerReview(user, formData.get('reviewId'))
  if (result.error) redirect(noticePath(path, 'error', result.error))
  revalidatePath(path)
  revalidatePath('/products')
  redirect(noticePath(path, 'success', 'Your review has been deleted.'))
}
