'use server'

import { redirect } from 'next/navigation'
import { addToCart, updateCart } from '@/server/cart'

export async function addToCartAction(formData) {
  const result = await addToCart({
    productID: formData.get('productID'),
    quantity: formData.get('quantity'),
  })
  if (result.redirectTo) redirect(result.redirectTo)
  if (result.error) throw new Error(result.error)
  const returnTo = formData.get('returnTo')
  if (typeof returnTo === 'string' && returnTo.startsWith('/') && !returnTo.startsWith('//')) {
    redirect(returnTo)
  }
  redirect('/cart')
}

export async function updateCartAction(formData) {
  const result = await updateCart({
    cartID: formData.get('cartID'),
    itemID: formData.get('itemID'),
    quantity: formData.get('quantity'),
  })
  if (result.redirectTo) redirect(result.redirectTo)
  if (result.error) throw new Error(result.error)
  redirect('/cart')
}
