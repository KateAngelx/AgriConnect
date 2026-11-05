import { readyStore } from './store'

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
  return store.productReviews.filter((review) => review.productId === productId)
}

function withRating(store, product) {
  return { ...product, ...summarizeRatings(reviewsFor(store, product.id)) }
}

function matchesProduct(product, filters) {
  if (!isPublicProduct(product)) return false
  if (filters.category && product.category?.id !== filters.category) return false
  if (filters.fulfillment === 'pickup' && !product.pickup) return false
  if (filters.fulfillment === 'delivery' && !product.delivery) return false
  if (filters.available && product.stock <= 0) return false
  if (filters.search) {
    const haystack = `${product.name} ${product.description ?? ''} ${product.location ?? ''}`.toLowerCase()
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

export async function listProducts(filters = {}) {
  const store = await readyStore()
  const page = Math.max(1, Number(filters.page) || 1)
  const limit = Math.max(1, Number(filters.limit) || 12)
  const docs = sortProducts(
    store.products.filter((product) => matchesProduct(product, filters)),
    filters.sort,
  )
  const result = pageResult(docs, page, limit)
  return { ...result, docs: result.docs.map((product) => withRating(store, product)) }
}

export async function getProduct(id) {
  const store = await readyStore()
  const product = store.products.find((item) => item.id === id && isPublicProduct(item))
  return product ? withRating(store, product) : null
}

export async function listProductReviews(productId) {
  const store = await readyStore()
  const product = store.products.find((item) => item.id === productId && isPublicProduct(item))
  if (!product) return pageResult([], 1, 50)
  const docs = reviewsFor(store, productId)
    .filter((review) => Number.isInteger(Number(review.rating)) && Number(review.rating) >= 1 && Number(review.rating) <= 5)
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

export async function listRelatedProducts(product) {
  const store = await readyStore()
  const docs = store.products.filter(
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

export async function listCategories() {
  const store = await readyStore()
  const docs = [...store.categories].sort((a, b) => a.name.localeCompare(b.name))
  return pageResult(docs, 1, 100)
}

export async function listCategoriesWithCounts() {
  const store = await readyStore()
  const counts = activeProductCounts(store)
  const docs = [...store.categories]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((category) => ({
      ...category,
      productCount: counts.get(category.id) || 0,
    }))
  return pageResult(docs, 1, 100)
}

export async function listSellers(filters = {}) {
  const store = await readyStore()
  const limit = Math.max(1, Number(filters.limit) || 12)
  const docs = store.sellers.filter((seller) => seller.status === 'approved')
  return pageResult(docs, 1, limit)
}

export async function getSeller(id) {
  const store = await readyStore()
  return store.sellers.find((seller) => seller.id === id && seller.status === 'approved') ?? null
}

export async function listSellerProducts(sellerId) {
  const store = await readyStore()
  const seller = store.sellers.find((item) => item.id === sellerId && item.status === 'approved')
  if (!seller) return pageResult([], 1, 24)
  const docs = store.products.filter(
    (product) => isPublicProduct(product) && product.seller?.id === sellerId,
  )
  return { ...pageResult(docs, 1, 24), docs: docs.map((item) => withRating(store, item)) }
}
