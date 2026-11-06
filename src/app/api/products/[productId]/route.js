import { getProduct, listProductReviews, listRelatedProducts } from '@/server/catalog'

export async function GET(_request, { params }) {
  const { productId } = await params
  const product = await getProduct(productId)
  if (!product) {
    return Response.json(
      { error: 'Product not found.' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } },
    )
  }
  const [related, reviews] = await Promise.all([
    listRelatedProducts(product),
    listProductReviews(product.id),
  ])
  return Response.json(
    { product, related: related.docs, reviews: reviews.docs },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
