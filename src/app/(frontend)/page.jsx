import MarketplaceHome from './marketplace-home'
import { SiteShell } from '@/components/site-shell'
import { currentUser } from '@/server/auth'
import { listCategories, listProductsPage, listSellers } from '@/server/catalog'

export default async function HomePage() {
  const [products, sellers, categories, user] = await Promise.all([
    listProductsPage({ limit: 6 }),
    listSellers({ limit: 4 }),
    listCategories(),
    currentUser(),
  ])
  return (
    <SiteShell user={user}>
      <MarketplaceHome
        user={user}
        products={products.docs}
        sellers={sellers.docs}
        categories={categories.docs}
      />
    </SiteShell>
  )
}
