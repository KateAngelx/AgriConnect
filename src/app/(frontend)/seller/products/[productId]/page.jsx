import { redirect } from 'next/navigation'

export default async function EditProductPage({ params }) {
  const { productId } = await params
  redirect(`/seller/products?edit=${encodeURIComponent(productId)}`)
}
