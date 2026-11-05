import { getSupabaseAdmin } from '@/lib/supabase'
import { readyStore } from './store'

function databaseEnabled() {
  return globalThis.__agriconnectStatus?.mode === 'supabase'
}

function wishlistItems(store, records) {
  return records.map((item) => ({
    ...item,
    product: store.products.find((product) => product.id === item.productId) || null,
  }))
}

export async function listWishlistState(userId) {
  const store = await readyStore()
  if (databaseEnabled()) {
    const client = getSupabaseAdmin()
    if (!client) throw new Error('Supabase is configured but its server client is unavailable.')
    const { data, error } = await client.rpc('read_buyer_wishlist', { p_buyer_id: userId })
    if (error) throw new Error(`wishlist_items: ${error.message}`)
    const records = Array.isArray(data?.items) ? data.items : []
    store.wishlists.set(userId, records)
    const revision = Number(data?.revision || 0)
    store.wishlistRevisions.set(userId, revision)
    return { items: wishlistItems(store, records), revision }
  }
  const records = store.wishlists.get(userId) ?? []
  return {
    items: wishlistItems(store, records),
    revision: Number(store.wishlistRevisions.get(userId) || 0),
  }
}

export async function listWishlist(userId) {
  return (await listWishlistState(userId)).items
}

export async function wished(userId, productId) {
  if (!userId) return false
  const wishlist = await listWishlistState(userId)
  return wishlist.items.some((item) => item.productId === productId)
}

export async function setWishlistItem(user, productId, saved) {
  const { isApprovedBuyer } = await import('./roles')
  if (!user || !isApprovedBuyer(user)) {
    const { authHref } = await import('@/lib/auth-links')
    const destination = productId ? `/products/${encodeURIComponent(productId)}` : '/products'
    return {
      error: 'Sign in with an approved buyer account to save products.',
      redirectTo: authHref('login', destination),
    }
  }
  const normalizedProductId = String(productId || '').trim()
  if (!normalizedProductId) return { error: 'Choose a product.' }
  if (typeof saved !== 'boolean') return { error: 'Choose whether to save or remove this product.' }

  const store = await readyStore()
  const client = databaseEnabled() ? getSupabaseAdmin() : null
  if (databaseEnabled() && !client)
    throw new Error('Supabase is configured but its server client is unavailable.')

  if (saved && !client) {
    const product = store.products.find((item) => item.id === normalizedProductId)
    if (!product || product.status !== 'active' || product.seller?.status !== 'approved')
      return { error: 'That product is not available.' }
  }

  let records = store.wishlists.get(user.id) ?? []
  let revision = Number(store.wishlistRevisions.get(user.id) || 0)
  if (client) {
    const { data, error } = await client.rpc('set_buyer_wishlist_item', {
      p_buyer_id: user.id,
      p_product_id: normalizedProductId,
      p_saved: saved,
    })
    if (error) throw new Error(`wishlist_items: ${error.message}`)
    records = Array.isArray(data?.items) ? data.items : []
    revision = Number(data?.revision || 0)
  } else {
    records = saved
      ? records.some((item) => item.productId === normalizedProductId)
        ? records
        : [...records, { id: crypto.randomUUID(), productId: normalizedProductId }]
      : records.filter((item) => item.productId !== normalizedProductId)
    revision += 1
  }
  store.wishlists.set(user.id, records)
  store.wishlistRevisions.set(user.id, revision)
  return { saved, items: wishlistItems(store, records), revision }
}

export async function toggleWishlist(user, productId) {
  const existing = await wished(user?.id, productId)
  return setWishlistItem(user, productId, !existing)
}
