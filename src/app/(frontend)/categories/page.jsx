import { CategoriesBrowser } from '@/components/categories-browser'
import { SiteShell } from '@/components/site-shell'
import { listCategoriesWithCounts } from '@/server/catalog'

export default async function CategoriesPage() {
  const { docs } = await listCategoriesWithCounts()
  const categories = docs.map((category) => {
    const image = typeof category.image === 'object' && category.image ? category.image : null
    return {
      id: category.id,
      name: category.name,
      description: category.description ?? '',
      imageUrl: image?.url ?? null,
      imageAlt: image?.alt ?? category.name,
      productCount: category.productCount ?? 0,
    }
  })

  return (
    <SiteShell>
      <CategoriesBrowser categories={categories} />
    </SiteShell>
  )
}
