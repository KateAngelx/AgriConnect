import {
  getCatalogSnapshot,
  getProduct,
  listProductReviews,
  listRelatedProducts,
} from '@/server/catalog'

export async function GET(_request, { params }) {
  const { productId } = await params
  const catalog = await getCatalogSnapshot()
  const product = await getProduct(productId, catalog)
  if (!product) {
    return Response.json(
      { error: 'Product not found.' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } },
    )
  }
  const [related, reviews] = await Promise.all([
    listRelatedProducts(product, catalog),
    listProductReviews(product.id, catalog),
  ])
  return Response.json(
    { product, related: related.docs, reviews: reviews.docs },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
