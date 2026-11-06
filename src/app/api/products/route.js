import { listProductsPage } from '@/server/catalog'

const responseCache = new Map()
const RESPONSE_CACHE_TTL_MS = 3_000

export async function GET(request) {
  const query = new URL(request.url).searchParams
  const categoryValue = String(query.get('category') ?? '').trim().toLowerCase()
  const category = categoryValue === 'all' ? '' : categoryValue
  const filters = {
    search: query.get('q') ?? '',
    category,
    sort: query.get('sort') ?? '-createdAt',
    page: Math.max(1, Number(query.get('page')) || 1),
    limit: Math.min(48, Math.max(1, Number(query.get('limit')) || 12)),
    fulfillment: query.get('fulfillment') ?? '',
    available: query.get('available') === 'true',
  }
  const key = JSON.stringify(filters)
  const cached = responseCache.get(key)
  if (cached && Date.now() - cached.savedAt < RESPONSE_CACHE_TTL_MS) {
    return Response.json(cached.products, {
      headers: { 'Cache-Control': 'private, max-age=3, stale-while-revalidate=15' },
    })
  }
  const products = await listProductsPage(filters)
  responseCache.set(key, { products, savedAt: Date.now() })
  if (responseCache.size > 40) {
    const oldestKey = responseCache.keys().next().value
    responseCache.delete(oldestKey)
  }
  return Response.json(products, {
    headers: {
      'Cache-Control': 'private, max-age=3, stale-while-revalidate=15',
    },
  })
}
