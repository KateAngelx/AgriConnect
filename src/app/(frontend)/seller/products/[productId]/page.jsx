import { notFound } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard-shell'
import { ProductForm } from '@/components/product-form'
import { requireApprovedSeller } from '@/server/guards'
import { listCategories } from '@/server/catalog'
import { ownedProduct } from '@/server/seller'

export default async function EditProductPage({ params }) {
  const user = await requireApprovedSeller()
  const { productId } = await params
  const [product, categories] = await Promise.all([ownedProduct(user, productId), listCategories()])
  if (!product) notFound()
  return (
    <DashboardShell user={user} title="Edit product" subtitle="Update pricing, stock, and listing details.">
      <ProductForm categories={categories.docs} product={product} />
    </DashboardShell>
  )
}
