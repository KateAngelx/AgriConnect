import { save } from './sync'
import { readyStore } from './store'

export async function listWishlist(userId) {
  const store = await readyStore()
  const items = store.wishlists.get(userId) ?? []
  return items
    .map((item) => ({
      ...item,
      product: store.products.find((product) => product.id === item.productId) || null,
    }))
}

export async function wished(userId, productId) {
  if (!userId) return false
  const store = await readyStore()
  return (store.wishlists.get(userId) ?? []).some((item) => item.productId === productId)
}

export async function toggleWishlist(user, productId) {
  const { isApprovedBuyer } = await import('./roles')
  if (!user || !isApprovedBuyer(user)) {
    const { authHref } = await import('@/lib/auth-links')
    const destination = productId ? `/products/${encodeURIComponent(productId)}` : '/products'
    return {
      error: 'Sign in with an approved buyer account to save products.',
      redirectTo: authHref('login', destination),
    }
  }
  const store = await readyStore()
  const items = store.wishlists.get(user.id) ?? []
  const existing = items.find((item) => item.productId === productId)
  if (existing) {
    store.wishlists.set(user.id, items.filter((item) => item.id !== existing.id))
    await save()
    return { saved: false }
  }
  const product = store.products.find(
    (item) =>
      item.id === productId &&
      item.status === 'active' &&
      item.seller?.status === 'approved',
  )
  if (!product) return { error: 'That product is not available.' }
  const next = [...items, { id: crypto.randomUUID(), productId }]
  store.wishlists.set(user.id, next)
  await save()
  return { saved: true }
}
