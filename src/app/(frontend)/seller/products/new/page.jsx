import { DashboardShell } from '@/components/dashboard-shell'
import { ProductForm } from '@/components/product-form'
import { requireApprovedSeller } from '@/server/guards'
import { listCategories } from '@/server/catalog'

export default async function NewProductPage() {
  const user = await requireApprovedSeller()
  const categories = await listCategories()
  return (
    <DashboardShell user={user} title="New product" subtitle="Add a listing with price, stock, and category.">
      <ProductForm categories={categories.docs} />
    </DashboardShell>
  )
}
