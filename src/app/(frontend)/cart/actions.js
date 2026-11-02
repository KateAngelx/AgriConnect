'use server'

import { redirect } from 'next/navigation'
import { addToCart, buyNow, updateCart } from '@/server/cart'

function safePath(value, fallback) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : fallback
}

function withNotice(path, key, message) {
  const joiner = path.includes('?') ? '&' : '?'
  return `${path}${joiner}${key}=${encodeURIComponent(message)}`
}

export async function addToCartAction(formData) {
  const result = await addToCart({
    productID: formData.get('productID'),
    quantity: formData.get('quantity'),
  })
  if (result.redirectTo) redirect(result.redirectTo)
  const back = safePath(formData.get('returnTo'), '/cart')
  if (result.error) redirect(withNotice(back, 'error', result.error))
  redirect(withNotice(back, 'success', 'Added to your cart.'))
}

export async function updateCartAction(formData) {
  const result = await updateCart({
    cartID: formData.get('cartID'),
    itemID: formData.get('itemID'),
    quantity: formData.get('quantity'),
  })
  if (result.redirectTo) redirect(result.redirectTo)
  if (result.error) redirect(withNotice('/cart', 'error', result.error))
  redirect('/cart')
}

export async function buyNowAction(formData) {
  const result = await buyNow({
    productID: formData.get('productID'),
    quantity: formData.get('quantity'),
  })
  if (result.redirectTo) redirect(result.redirectTo)
  if (result.error) redirect(withNotice(safePath(formData.get('returnTo'), '/cart'), 'error', result.error))
  redirect('/checkout')
}
