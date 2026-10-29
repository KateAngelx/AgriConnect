import MarketplaceHome from './marketplace-home'
import { SiteShell } from '@/components/site-shell'
import { currentUser } from '@/server/auth'
import { listCategories, listProducts, listSellers } from '@/server/catalog'

export default async function HomePage() {
  const [products, sellers, categories, user] = await Promise.all([
    listProducts({ limit: 6 }),
    listSellers({ limit: 4 }),
    listCategories(),
    currentUser(),
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
