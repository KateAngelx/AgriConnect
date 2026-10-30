import { DELIVERY_FEE } from '../payments'
import { readyStore } from '../store'
import { parseMarketplaceQuery, productMatchesSearch } from '@/server/ai/marketplace-search'

function mapProduct(product) {
  return {
    id: product.id,
    name: product.name,
    description: String(product.description || '').slice(0, 280),
    price: product.price,
    unit: product.unit,
    stock: product.stock,
    location: product.location,
    seller: product.seller?.farmName || 'Seller',
    sellerLocation: product.seller?.location || product.location,
    pickup: product.pickup,
    delivery: product.delivery,
    deliveryFee: DELIVERY_FEE,
    category: product.category?.name || '',
    categoryId: product.category?.id || '',
    listedAt: product.createdAt || null,
    available: product.stock > 0,
    stockStatus: product.stock > 0 ? 'in stock' : 'out of stock',
  }
}

function catalogSummary(activeProducts, categories) {
  const byCategory = new Map()
  for (const product of activeProducts) {
    const id = product.category?.id || 'uncategorized'
    const name = product.category?.name || 'Other'
    const row = byCategory.get(id) || { id, name, count: 0 }
    row.count += 1
    byCategory.set(id, row)
  }
  return {
    totalActiveProducts: activeProducts.length,
    categories: categories
      .map((cat) => ({
        id: cat.id,
        name: cat.name,
        productCount: byCategory.get(cat.id)?.count ?? 0,
      }))
      .filter((row) => row.productCount > 0),
  }
}

export async function marketplaceProductFacts({ query, limit = 48 }) {
  const store = await readyStore()
  const parsed = parseMarketplaceQuery(query, store.categories)
  const active = store.products.filter(
    (product) => product.status === 'active' && product.seller?.status === 'approved',
  )

  const normalizedQuestion = String(query || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  const locationMatches = active.filter((product) => {
    const locations = [product.location, product.seller?.location]
      .filter(Boolean)
      .map((location) => String(location).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim())
      .filter(Boolean)
    return locations.some((location) => normalizedQuestion.includes(location))
  })
  const hasExplicitLocation = active.some((product) =>
    [product.location, product.seller?.location].some((location) => {
      const normalized = String(location || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
      return normalized && normalizedQuestion.includes(normalized)
    }),
  )
  let matched = active.filter((product) => {
    if (product.stock <= 0) return false
    if (parsed.fulfillment === 'pickup' && !product.pickup) return false
    if (parsed.fulfillment === 'delivery' && !product.delivery) return false
    if (parsed.inStockOnly && product.stock <= 0) return false
    if (hasExplicitLocation && !locationMatches.some((entry) => entry.id === product.id)) return false
    return productMatchesSearch(product, parsed)
  })

  if (matched.length === 0 && parsed.categoryIds.length > 0) {
    matched = active.filter(
      (product) =>
        product.stock > 0 && parsed.categoryIds.includes(product.category?.id),
    )
  }

  if (matched.length === 0 && parsed.tokens.length > 0) {
    matched = active.filter((product) => {
      const haystack = [
        product.name,
        product.description,
        product.category?.name,
        product.location,
        product.seller?.farmName,
      ]
        .join(' ')
        .toLowerCase()
      return product.stock > 0 && parsed.tokens.some((token) => haystack.includes(token))
    })
  }

  if (matched.length === 0 && (parsed.browseAll || parsed.categoryIds.length > 0)) {
    matched = active.filter((product) => {
      if (product.stock <= 0) return false
      const { maxPricePhp, minPricePhp } = parsed
      if (maxPricePhp == null && minPricePhp == null) return true
      const price = Number(product.price)
      if (maxPricePhp != null && price > maxPricePhp) return false
      if (minPricePhp != null && price < minPricePhp) return false
      return true
    })
  }

  if (parsed.newestOnly) {
    matched.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
  } else if (parsed.maxPricePhp != null || parsed.minPricePhp != null) {
    matched.sort((a, b) => Number(a.price) - Number(b.price))
  }

  const products = matched.slice(0, limit).map(mapProduct)
  const summary = catalogSummary(active, store.categories)

  return {
    generatedAt: new Date().toISOString(),
    searchInterpretation: {
      tokens: parsed.tokens,
      categoryIds: parsed.categoryIds,
      browseAll: parsed.browseAll,
      maxPricePhp: parsed.maxPricePhp,
      minPricePhp: parsed.minPricePhp,
      priceFilterOnly: parsed.priceFilterOnly,
      fulfillment: parsed.fulfillment,
      inStockOnly: parsed.inStockOnly,
      newestOnly: parsed.newestOnly,
    },
    catalogSummary: summary,
    count: products.length,
    products,
    palengkeNote:
      'No verified live palengke price feed is connected. Compare only to AgriConnect listings unless the assistant clearly labels an estimate.',
  }
}

/** True when the model claims empty marketplace but facts include listings. */
export function buyerAnswerDeniesListings(answer, facts) {
  if (!facts?.products?.length) return false
  const text = String(answer ?? '').toLowerCase()
  return (
    /no (available )?(fruit|vegetable|product|listing)/.test(text) ||
    /there are no .*listings/.test(text) ||
    /no matching products/.test(text) ||
    (/0 listings/.test(text) && facts.count > 0) ||
    (/count:\s*0/.test(text) && facts.count > 0) ||
    (/no .*listings available that match/.test(text) && facts.count > 0) ||
    (text.includes('no available') && text.includes('listing'))
  )
}
