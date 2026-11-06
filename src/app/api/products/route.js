import { getCatalogSnapshot, listProductsPage } from '@/server/catalog'

export async function GET(request) {
  const query = new URL(request.url).searchParams
  const catalog = await getCatalogSnapshot({ includeImages: false, includeReviews: false })
  const products = await listProductsPage({
    search: query.get('q') ?? '',
    category: query.get('category') ?? '',
    sort: query.get('sort') ?? '-createdAt',
    page: Math.max(1, Number(query.get('page')) || 1),
    limit: Math.min(48, Math.max(1, Number(query.get('limit')) || 12)),
    fulfillment: query.get('fulfillment') ?? '',
    available: query.get('available') === 'true',
  }, catalog)
  return Response.json(products, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
