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

function matchesProduct(product, filters) {
  if (product.status !== 'active') return false
  if (product.seller?.status !== 'approved') return false
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
  return pageResult(docs, page, limit)
}

export async function getProduct(id) {
  const store = await readyStore()
  return store.products.find((product) => product.id === id) ?? null
}

export async function listRelatedProducts(product) {
  const store = await readyStore()
  const docs = store.products.filter(
      (item) =>
        item.status === 'active' &&
        item.seller?.status === 'approved' &&
        item.id !== product?.id &&
        item.category?.id === product?.category?.id,
    )
    .slice(0, 3)
  return pageResult(docs, 1, 3)
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
  return store.sellers.find((seller) => seller.id === id) ?? null
}

export async function listSellerProducts(sellerId) {
  const store = await readyStore()
  const docs = store.products.filter(
    (product) => product.status === 'active' && product.seller?.id === sellerId,
  )
  return pageResult(docs, 1, 24)
}
