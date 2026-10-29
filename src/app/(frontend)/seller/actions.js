'use server'

import { redirect } from 'next/navigation'
import { currentUser } from '@/server/auth'
import { hasRole, isApprovedSeller } from '@/server/roles'
import {
  advanceOrder,
  cancelOrder,
  removeProduct,
  saveProduct,
  saveSellerProfile,
  sellerCollect,
  updateStock,
} from '@/server/seller'

async function seller() {
  const user = await currentUser()
  if (!user) redirect('/login')
  if (!hasRole(user, 'seller')) redirect('/account')
  if (!isApprovedSeller(user)) redirect('/seller/dashboard')
  return user
}

export async function saveProductAction(_state, formData) {
  const user = await seller()
  const result = await saveProduct(user, {
    productId: formData.get('productId'),
    name: formData.get('name'),
    description: formData.get('description'),
    price: formData.get('price'),
    unit: formData.get('unit'),
    stock: formData.get('stock'),
    category: formData.get('category'),
    location: formData.get('location'),
    imageUrl: formData.get('imageUrl'),
    pickup: formData.get('pickup'),
    delivery: formData.get('delivery'),
    status: formData.get('status'),
  })
  if (result.error) return result
  redirect('/seller/products')
}

export async function saveProfileAction(_state, formData) {
  const user = await seller()
  const result = await saveSellerProfile(user, {
    farmName: formData.get('farmName'),
    location: formData.get('location'),
    landmark: formData.get('landmark'),
    pickupLat: formData.get('pickupLat'),
    pickupLng: formData.get('pickupLng'),
    description: formData.get('description'),
  })
  if (result.error) return result
  redirect('/seller/dashboard')
}

export async function updateStockAction(formData) {
  const user = await seller()
  const result = await updateStock(user, formData.get('productId'), formData.get('stock'))
  const error = result.error ? `?error=${encodeURIComponent(result.error)}` : ''
  redirect(`/seller/inventory${error}`)
}

export async function removeProductAction(formData) {
  const user = await seller()
  const result = await removeProduct(user, formData.get('productId'))
  const error = result.error ? `?error=${encodeURIComponent(result.error)}` : ''
  redirect(`/seller/products${error}`)
}

export async function advanceOrderAction(formData) {
  const user = await seller()
  const result = await advanceOrder(user, formData.get('orderId'))
  if (result.error) redirect(`/seller/orders?error=${encodeURIComponent(result.error)}`)
  redirect('/seller/orders?success=Order%20status%20updated')
}

export async function cancelOrderAction(formData) {
  const user = await seller()
  const result = await cancelOrder(user, formData.get('orderId'))
  if (result.error) redirect(`/seller/orders?error=${encodeURIComponent(result.error)}`)
  redirect('/seller/orders?success=Order%20cancelled%20and%20stock%20restored')
}

export async function collectOrderAction(formData) {
  const user = await seller()
  const result = await sellerCollect(user, formData.get('orderId'))
  const error = result.error ? `?error=${encodeURIComponent(result.error)}` : ''
  redirect(`/seller/orders${error}`)
}
