import { getSeller, listSellerProducts } from '@/server/catalog'

export async function GET(_request, { params }) {
  const { sellerId } = await params
  const seller = await getSeller(sellerId)
  if (!seller) return Response.json({ error: 'Seller not found.' }, { status: 404 })
  const products = await listSellerProducts(seller.id)
  return Response.json({ seller, products: products.docs })
}
