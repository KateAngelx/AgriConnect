import { listProducts } from '@/server/catalog'

export async function GET(request) {
  const query = new URL(request.url).searchParams
  const products = await listProducts({
    search: query.get('q') ?? '',
    category: query.get('category') ?? '',
    sort: query.get('sort') ?? '-createdAt',
    page: Math.max(1, Number(query.get('page')) || 1),
    fulfillment: query.get('fulfillment') ?? '',
    available: query.get('available') === 'true',
  })
  return Response.json(products)
}
