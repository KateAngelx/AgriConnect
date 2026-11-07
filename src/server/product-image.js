import { getSupabaseAdmin, supabaseEnv } from '@/lib/supabase'
import {
  isRemovedBenguetProduct,
  isRemovedBenguetSeller,
  isRemovedNuevaEcijaProduct,
  isRemovedNuevaEcijaSeller,
} from './catalog-visibility'

const LOOKUP_CACHE_TTL_MS = 15_000
const MAX_LOOKUP_CACHE_ENTRIES = 500
const lookupCache = (globalThis.__agriconnectProductImageLookupCache ??= {
  products: new Map(),
  sellers: new Map(),
})

async function cachedLookup(cache, key, load) {
  const cached = cache.get(key)
  if (cached && cached.expiresAt > Date.now()) return cached.promise
  if (cached) cache.delete(key)

  const entry = {
    expiresAt: Date.now() + LOOKUP_CACHE_TTL_MS,
    promise: Promise.resolve().then(load),
  }
  cache.set(key, entry)
  if (cache.size > MAX_LOOKUP_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value
    cache.delete(oldestKey)
  }

  try {
    const value = await entry.promise
    if (!value && cache.get(key) === entry) cache.delete(key)
    return value
  } catch (error) {
    if (cache.get(key) === entry) cache.delete(key)
    throw error
  }
}

export async function loadPublicProductImage(productId, client = null) {
  if (!client && supabaseEnv().enabled) {
    client = getSupabaseAdmin()
    if (!client) throw new Error('Supabase is configured but its server client is unavailable.')
  }
  if (!client) return null

  const product = await cachedLookup(lookupCache.products, productId, async () => {
    const { data, error } = await client
      .from('products')
      .select('id,name,location,status,seller_id,images')
      .eq('id', productId)
      .maybeSingle()
    if (error) throw new Error(`Could not load product image: ${error.message}`)
    return data
  })
  if (!product?.seller_id) return null

  const seller = await cachedLookup(lookupCache.sellers, product.seller_id, async () => {
    const { data, error } = await client
      .from('sellers')
      .select('id,farm_name,location,status')
      .eq('id', product.seller_id)
      .maybeSingle()
    if (error) throw new Error(`Could not verify product seller: ${error.message}`)
    return data
  })
  const publicProduct =
    product.status === 'active' &&
    seller?.status === 'approved' &&
    !isRemovedBenguetProduct(product) &&
    !isRemovedNuevaEcijaProduct(product) &&
    !isRemovedBenguetSeller(seller) &&
    !isRemovedNuevaEcijaSeller(seller)
  return publicProduct ? { product, seller } : null
}
