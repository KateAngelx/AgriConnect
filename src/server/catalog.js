import { getSupabaseAdmin, supabaseEnv } from '@/lib/supabase'
import { readyStore } from './store'
import {
  isRemovedBenguetProduct,
  isRemovedBenguetSeller,
  isRemovedNuevaEcijaProduct,
  isRemovedNuevaEcijaSeller,
} from './catalog-visibility'

globalThis.__agriconnectProductPageCache ??= new Map()

function cacheProductPage(key, result) {
  globalThis.__agriconnectProductPageCache.set(key, { result, savedAt: Date.now() })
  if (globalThis.__agriconnectProductPageCache.size > 40) {
    const oldestKey = globalThis.__agriconnectProductPageCache.keys().next().value
    globalThis.__agriconnectProductPageCache.delete(oldestKey)
  }
  return result
}

function requiredRows(result, table) {
  if (result.error) throw new Error(`Could not load marketplace ${table}: ${result.error.message}`)
  return result.data || []
}

function optionalReviewRows(result) {
  if (!result.error) return result.data || []
  if (
    result.error.code === 'PGRST205' ||
    /Could not find the table|relation .* does not exist/i.test(result.error.message || '')
  ) {
    return []
  }
  throw new Error(`Could not load marketplace reviews: ${result.error.message}`)
}

export async function getCatalogSnapshot({
  includeInactive = false,
  includeImages = true,
  includeReviews = true,
  sellerId = '',
} = {}) {
  if (!supabaseEnv().enabled) return readyStore()
  const client = getSupabaseAdmin()
  if (!client) throw new Error('Supabase is configured but its server client is unavailable.')

  const productColumns = [
    'id',
    'name',
    'description',
    'price',
    'unit',
    'stock',
    'location',
    'status',
    'pickup',
    'delivery',
    'created_at',
    'category_id',
    'seller_id',
    ...(includeImages ? ['images'] : []),
  ].join(',')
  let productsQuery = client
    .from('products')
    .select(includeImages ? '*' : productColumns)
    .order('created_at', { ascending: false })
  if (!includeInactive) productsQuery = productsQuery.eq('status', 'active')
  if (sellerId) productsQuery = productsQuery.eq('seller_id', sellerId)

  const [categoriesResult, sellersResult, productsResult, reviewsResult] = await Promise.all([
    client.from('categories').select(includeImages ? '*' : 'id,name'),
    client
      .from('sellers')
      .select(includeImages ? '*' : 'id,farm_name,location,status,owner_id'),
    productsQuery,
    includeReviews
      ? client.from('product_reviews').select('*')
      : Promise.resolve({ data: [], error: null }),
  ])
  const categories = requiredRows(categoriesResult, 'categories').map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description || '',
    image: row.image || {},
  }))
  const sellers = requiredRows(sellersResult, 'sellers')
    .filter((row) => !isRemovedBenguetSeller(row) && !isRemovedNuevaEcijaSeller(row))
    .map((row) => ({
      id: row.id,
      farmName: row.farm_name,
      location: row.location || '',
      landmark: row.landmark || '',
      pickupLat: row.pickup_lat ?? null,
      pickupLng: row.pickup_lng ?? null,
      status: row.status,
      description: row.description || '',
      ownerId: row.owner_id || '',
      image: row.image || {},
    }))
  const products = requiredRows(productsResult, 'products')
    .filter((row) => !isRemovedBenguetProduct(row) && !isRemovedNuevaEcijaProduct(row))
    .map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description || '',
      price: Number(row.price),
      unit: row.unit,
      stock: Number(row.stock),
      location: row.location || '',
      status: row.status,
      pickup: row.pickup,
      delivery: row.delivery,
      createdAt: row.created_at,
      images: row.images || [],
      category: categories.find((item) => item.id === row.category_id) || null,
      seller: sellers.find((item) => item.id === row.seller_id) || null,
    }))
  const productReviews = optionalReviewRows(reviewsResult).map((row) => ({
    id: row.id,
    productId: row.product_id,
    reviewerName: row.reviewer_name || '',
    rating: Number(row.rating),
    body: row.body || '',
    moderationStatus: row.moderation_status || 'published',
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || row.created_at || '',
  }))

  return { categories, sellers, products, productReviews }
}

function pageResult(docs, page, limit) {
  const totalDocs = docs.length
  const totalPages = Math.ceil(totalDocs / limit) || 0
  const start = (page - 1) * limit
  return {
    docs: docs.slice(start, start + limit),
    totalDocs,
    totalPages,
    page,
  }
}

export function isPublicProduct(product) {
  return product?.status === 'active' && product.seller?.status === 'approved'
}

export function summarizeRatings(reviews = []) {
  const ratings = reviews
    .map((review) => Number(review.rating))
    .filter((rating) => Number.isInteger(rating) && rating >= 1 && rating <= 5)
  const reviewCount = ratings.length
  const average = reviewCount
    ? Math.round((ratings.reduce((sum, rating) => sum + rating, 0) / reviewCount) * 10) / 10
    : null
  return { rating: average, reviewCount }
}

function reviewsFor(store, productId) {
  return store.productReviews.filter(
    (review) =>
      review.productId === productId && (review.moderationStatus || 'published') === 'published',
  )
}

function withRating(store, product) {
  return { ...product, ...summarizeRatings(reviewsFor(store, product.id)) }
}

function matchesProduct(product, filters) {
  if (!isPublicProduct(product)) return false
  const categoryValue = String(filters.category || '').trim().toLowerCase()
  const category = categoryValue === 'all' ? '' : categoryValue
  if (category && product.category?.id !== category) return false
  if (filters.fulfillment === 'pickup' && !product.pickup) return false
  if (filters.fulfillment === 'delivery' && !product.delivery) return false
  if (filters.available && product.stock <= 0) return false
  if (filters.search) {
    const haystack =
      `${product.name} ${product.description ?? ''} ${product.location ?? ''}`.toLowerCase()
    if (!haystack.includes(filters.search.toLowerCase())) return false
  }
  return true
}

function sortProducts(products, sort) {
  const copy = [...products]
  if (sort === 'price') return copy.sort((a, b) => a.price - b.price)
  if (sort === '-price') return copy.sort((a, b) => b.price - a.price)
  return copy.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

function productsPage(store, filters = {}) {
  const page = Math.max(1, Number(filters.page) || 1)
  const limit = Math.max(1, Number(filters.limit) || 12)
  const docs = sortProducts(
    store.products.filter((product) => matchesProduct(product, filters)),
    filters.sort,
  )
  const result = pageResult(docs, page, limit)
  return { ...result, docs: result.docs.map((product) => withRating(store, product)) }
}

export async function listProducts(filters = {}, store = null) {
  return productsPage(store || (await getCatalogSnapshot()), filters)
}

export async function listProductsPage(filters = {}, store = null) {
  const useSupabase = supabaseEnv().enabled
  const client = getSupabaseAdmin()
  const categoryValue = String(filters.category || '').trim().toLowerCase()
  const normalizedCategory = categoryValue === 'all' ? '' : categoryValue
  const pageCacheKey = JSON.stringify({
    search: String(filters.search || ''),
    category: normalizedCategory,
    sort: String(filters.sort || '-createdAt'),
    page: Math.max(1, Number(filters.page) || 1),
    limit: Math.max(1, Number(filters.limit) || 12),
    fulfillment: String(filters.fulfillment || ''),
    available: filters.available === true,
  })
  if (!store && useSupabase && client && globalThis.__agriconnectProductPageCache) {
    const cached = globalThis.__agriconnectProductPageCache.get(pageCacheKey)
    if (cached && Date.now() - cached.savedAt < 3_000) return cached.result
  }
  if (!useSupabase || !client) {
    store ||= await getCatalogSnapshot({
      includeImages: true,
      includeReviews: true,
    })
    const result = productsPage(store, { ...filters, category: normalizedCategory })
    return {
      ...result,
      docs: result.docs.map((product) => ({
        ...product,
        imageSrc: `/api/products/${encodeURIComponent(product.id)}/image`,
        images: [],
      })),
    }
  }
  const page = Math.max(1, Number(filters.page) || 1)
  const limit = Math.min(48, Math.max(1, Number(filters.limit) || 12))
  const from = (page - 1) * limit
  const to = from + limit - 1
  let productQuery = client
    .from('products')
    .select('*', { count: 'exact' })
    .eq('status', 'active')
  if (normalizedCategory) productQuery = productQuery.eq('category_id', normalizedCategory)
  if (filters.fulfillment === 'pickup') productQuery = productQuery.eq('pickup', true)
  if (filters.fulfillment === 'delivery') productQuery = productQuery.eq('delivery', true)
  if (filters.available) productQuery = productQuery.gt('stock', 0)
  if (filters.search) {
    const search = String(filters.search).trim().replaceAll(',', ' ')
    if (search) productQuery = productQuery.or(`name.ilike.%${search}%,description.ilike.%${search}%,location.ilike.%${search}%`)
  }
  if (filters.sort === 'price') productQuery = productQuery.order('price', { ascending: true })
  else if (filters.sort === '-price') productQuery = productQuery.order('price', { ascending: false })
  else productQuery = productQuery.order('created_at', { ascending: false })

  const { data: productRows, count, error: productError } = await productQuery.range(from, to)
  if (productError) throw new Error(`Could not load marketplace products: ${productError.message}`)
  const filteredRows = (productRows || []).filter((row) =>
    !isRemovedBenguetProduct(row) && !isRemovedNuevaEcijaProduct(row),
  )
  if (filteredRows.length === 0) {
    return cacheProductPage(pageCacheKey, {
      docs: [],
      totalDocs: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
      page,
    })
  }

  const sellerIds = [...new Set(filteredRows.map((row) => row.seller_id).filter(Boolean))]
  const categoryIds = [...new Set(filteredRows.map((row) => row.category_id).filter(Boolean))]
  const productIds = filteredRows.map((row) => row.id)
  const [sellersResult, categoriesResult, reviewsResult] = await Promise.all([
    sellerIds.length
      ? client.from('sellers').select('*').in('id', sellerIds)
      : Promise.resolve({ data: [], error: null }),
    categoryIds.length
      ? client.from('categories').select('id,name,description,image').in('id', categoryIds)
      : Promise.resolve({ data: [], error: null }),
    client
      .from('product_reviews')
      .select('product_id,rating,moderation_status')
      .in('product_id', productIds),
  ])
  if (sellersResult.error) throw new Error(`Could not load marketplace sellers: ${sellersResult.error.message}`)
  if (categoriesResult.error) throw new Error(`Could not load marketplace categories: ${categoriesResult.error.message}`)
  const sellers = requiredRows(sellersResult, 'sellers')
    .filter((row) => !isRemovedBenguetSeller(row) && !isRemovedNuevaEcijaSeller(row))
  const categories = requiredRows(categoriesResult, 'categories')
  const ratingsByProduct = new Map()
  for (const review of optionalReviewRows(reviewsResult)) {
    if (review.moderation_status && review.moderation_status !== 'published') continue
    const ratings = ratingsByProduct.get(review.product_id) || []
    ratings.push({ rating: review.rating })
    ratingsByProduct.set(review.product_id, ratings)
  }

  return cacheProductPage(pageCacheKey, {
    docs: filteredRows.map((row) => {
      const seller = sellers.find((item) => item.id === row.seller_id)
      const category = categories.find((item) => item.id === row.category_id)
      if (!seller || seller.status !== 'approved') return null
      const product = {
        id: row.id,
        name: row.name,
        description: row.description || '',
        price: Number(row.price),
        unit: row.unit,
        stock: Number(row.stock),
        location: row.location || '',
        status: row.status,
        pickup: row.pickup,
        delivery: row.delivery,
        createdAt: row.created_at,
        images: [],
        category: category ? { id: category.id, name: category.name, description: category.description || '', image: category.image || {} } : null,
        seller: {
          id: seller.id,
          farmName: seller.farm_name,
          location: seller.location || '',
          landmark: seller.landmark || '',
          pickupLat: seller.pickup_lat ?? null,
          pickupLng: seller.pickup_lng ?? null,
          status: seller.status,
          description: seller.description || '',
          ownerId: seller.owner_id || '',
          image: seller.image || {},
        },
      }
      return {
        ...product,
        imageSrc: `/api/products/${encodeURIComponent(product.id)}/image`,
        ...summarizeRatings(ratingsByProduct.get(product.id)),
      }
    }).filter(Boolean),
    totalDocs: count || 0,
    totalPages: Math.ceil((count || 0) / limit),
    page,
  })
  /*
   * The former implementation loaded every product and review for every page.
   * Supabase pagination above keeps the requested interaction on the database
   * side and only fetches the five visible records.
   */
}

export async function getProduct(id, store = null) {
  store ||= await getCatalogSnapshot()
  const product = store.products.find((item) => item.id === id && isPublicProduct(item))
  return product ? withRating(store, product) : null
}

export async function listProductReviews(productId, store = null) {
  store ||= await getCatalogSnapshot()
  const product = store.products.find((item) => item.id === productId && isPublicProduct(item))
  if (!product) return pageResult([], 1, 50)
  const docs = reviewsFor(store, productId)
    .filter(
      (review) =>
        Number.isInteger(Number(review.rating)) &&
        Number(review.rating) >= 1 &&
        Number(review.rating) <= 5,
    )
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((review) => ({
      id: review.id,
      reviewerName: review.reviewerName || 'Marketplace customer',
      rating: Number(review.rating),
      body: review.body || '',
      createdAt: review.createdAt || '',
    }))
  return pageResult(docs, 1, 50)
}

export async function listRelatedProducts(product, store = null) {
  store ||= await getCatalogSnapshot()
  const docs = store.products
    .filter(
      (item) =>
        isPublicProduct(item) &&
        item.id !== product?.id &&
        item.category?.id === product?.category?.id,
    )
    .slice(0, 3)
  return { ...pageResult(docs, 1, 3), docs: docs.map((item) => withRating(store, item)) }
}

function activeProductCounts(store) {
  const counts = new Map()
  for (const product of store.products) {
    if (product.status !== 'active' || product.seller?.status !== 'approved') continue
    const id = product.category?.id
    if (!id) continue
    counts.set(id, (counts.get(id) || 0) + 1)
  }
  return counts
}

export async function listCategories(store = null) {
  if (!store && supabaseEnv().enabled) {
    const client = getSupabaseAdmin()
    if (client) {
      const { data, error } = await client
        .from('categories')
        .select('id,name,description,image')
        .order('name', { ascending: true })
        .limit(100)
      if (error) throw new Error(`Could not load marketplace categories: ${error.message}`)
      return pageResult((data || []).map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description || '',
        image: row.image || {},
      })), 1, 100)
    }
  }
  store ||= await getCatalogSnapshot()
  const docs = [...store.categories].sort((a, b) => a.name.localeCompare(b.name))
  return pageResult(docs, 1, 100)
}

export async function listCategoriesWithCounts(store = null) {
  store ||= await getCatalogSnapshot()
  const counts = activeProductCounts(store)
  const docs = [...store.categories]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((category) => ({
      ...category,
      productCount: counts.get(category.id) || 0,
    }))
  return pageResult(docs, 1, 100)
}

export async function listSellers(filters = {}, store = null) {
  store ||= await getCatalogSnapshot()
  const page = Math.max(1, Number(filters.page) || 1)
  const limit = Math.max(1, Number(filters.limit) || 12)
  const docs = store.sellers
    .filter((seller) => seller.status === 'approved')
    .sort((a, b) => String(a.farmName || '').localeCompare(String(b.farmName || '')))
  return pageResult(docs, page, limit)
}

export async function getSeller(id, store = null) {
  store ||= await getCatalogSnapshot()
  return store.sellers.find((seller) => seller.id === id && seller.status === 'approved') ?? null
}

export async function listSellerProducts(sellerId, store = null) {
  store ||= await getCatalogSnapshot()
  const seller = store.sellers.find((item) => item.id === sellerId && item.status === 'approved')
  if (!seller) return pageResult([], 1, 24)
  const docs = store.products.filter(
    (product) => isPublicProduct(product) && product.seller?.id === sellerId,
  )
  return { ...pageResult(docs, 1, 24), docs: docs.map((item) => withRating(store, item)) }
}
