import { getSupabaseAdmin, supabaseEnv } from '@/lib/supabase'
import { getStore, readyStore } from './store'

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
  const directClient = supabaseEnv().serviceKey ? getSupabaseAdmin() : null
  if (directClient) {
    const { data, error } = await directClient.rpc('read_buyer_wishlist', { p_buyer_id: userId })
    if (error) throw new Error(`wishlist_items: ${error.message}`)
    const records = Array.isArray(data?.items) ? data.items : []
    const store = getStore()
    store.wishlists.set(userId, records)
    const revision = Number(data?.revision || 0)
    store.wishlistRevisions.set(userId, revision)
    const products = await wishlistProducts(directClient, records)
    return { items: records.map((item) => ({ ...item, product: products.get(item.productId) || null })), revision }
  }

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

async function wishlistProducts(client, records) {
  const productIds = [...new Set(records.map((item) => item.productId).filter(Boolean))]
  if (!productIds.length) return new Map()
  const { data: productRows, error: productError } = await client
    .from('products')
    .select('id,name,price,unit,stock,location,status,seller_id,images')
    .in('id', productIds)
  if (productError) throw new Error(`Could not load wishlist products: ${productError.message}`)
  const sellerIds = [...new Set((productRows || []).map((product) => product.seller_id).filter(Boolean))]
  const { data: sellerRows, error: sellerError } = sellerIds.length
    ? await client.from('sellers').select('id,farm_name,status').in('id', sellerIds)
    : { data: [], error: null }
  if (sellerError) throw new Error(`Could not load wishlist sellers: ${sellerError.message}`)
  const sellers = new Map((sellerRows || []).map((seller) => [seller.id, seller]))
  return new Map((productRows || []).map((product) => [
    product.id,
    {
      id: product.id,
      name: product.name,
      price: Number(product.price || 0),
      unit: product.unit || 'item',
      stock: Number(product.stock || 0),
      location: product.location || '',
      status: product.status,
      images: product.images || [],
      seller: sellers.has(product.seller_id)
        ? {
            id: product.seller_id,
            farmName: sellers.get(product.seller_id).farm_name,
            status: sellers.get(product.seller_id).status,
          }
        : null,
    },
  ]))
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

  const client = supabaseEnv().serviceKey ? getSupabaseAdmin() : null
  if (client) {
    const { data, error } = await client.rpc('set_buyer_wishlist_item', {
      p_buyer_id: user.id,
      p_product_id: normalizedProductId,
      p_saved: saved,
    })
    if (error) throw new Error(`wishlist_items: ${error.message}`)
    const records = Array.isArray(data?.items) ? data.items : []
    const revision = Number(data?.revision || 0)
    const store = getStore()
    store.wishlists.set(user.id, records)
    store.wishlistRevisions.set(user.id, revision)
    const products = await wishlistProducts(client, records)
    return {
      saved,
      items: records.map((item) => ({ ...item, product: products.get(item.productId) || null })),
      revision,
    }
  }

  const store = await readyStore()
  const fallbackClient = databaseEnabled() ? getSupabaseAdmin() : null
  if (databaseEnabled() && !fallbackClient)
    throw new Error('Supabase is configured but its server client is unavailable.')

  if (saved && !fallbackClient) {
    const product = store.products.find((item) => item.id === normalizedProductId)
    if (!product || product.status !== 'active' || product.seller?.status !== 'approved')
      return { error: 'That product is not available.' }
  }

  let records = store.wishlists.get(user.id) ?? []
  let revision = Number(store.wishlistRevisions.get(user.id) || 0)
  if (fallbackClient) {
    const { data, error } = await fallbackClient.rpc('set_buyer_wishlist_item', {
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
