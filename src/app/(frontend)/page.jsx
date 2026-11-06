import MarketplaceHome from './marketplace-home'
import { SiteShell } from '@/components/site-shell'
import { currentUser } from '@/server/auth'
import { getCatalogSnapshot, listCategories, listProducts, listSellers } from '@/server/catalog'

export default async function HomePage() {
  const [catalog, user] = await Promise.all([
    getCatalogSnapshot(),
    currentUser(),
  ])
  const [products, sellers, categories] = await Promise.all([
    listProducts({ limit: 6 }, catalog),
    listSellers({ limit: 4 }, catalog),
    listCategories(catalog),
  ])
  return (
    <SiteShell>
      <MarketplaceHome
        user={user}
        products={products.docs}
        sellers={sellers.docs}
        categories={categories.docs}
      />
    </SiteShell>
  )
}
