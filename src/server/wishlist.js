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
    .filter((item) => item.product)
}

export async function wished(userId, productId) {
  if (!userId) return false
  const store = await readyStore()
  return (store.wishlists.get(userId) ?? []).some((item) => item.productId === productId)
}

export async function toggleWishlist(user, productId) {
  const { isApprovedBuyer } = await import('./roles')
  if (!user || !isApprovedBuyer(user)) {
    return { error: 'Sign in with an approved buyer account to save products.', redirectTo: '/login' }
  }
  const store = await readyStore()
  const product = store.products.find((item) => item.id === productId && item.status === 'active')
  if (!product) return { error: 'That product is not available.' }
  const items = store.wishlists.get(user.id) ?? []
  const existing = items.find((item) => item.productId === productId)
  const next = existing ? items.filter((item) => item.id !== existing.id) : [...items, { id: crypto.randomUUID(), productId }]
  store.wishlists.set(user.id, next)
  await save()
  return { saved: !existing }
}
