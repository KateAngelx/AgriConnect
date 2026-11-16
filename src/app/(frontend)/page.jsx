import MarketplaceHome from './marketplace-home'
import { SiteShell } from '@/components/site-shell'
import { currentUser } from '@/server/auth'
import { listCategories, listProductsPage, listSellers, sellerRatingSummaries } from '@/server/catalog'
import { publicFeedback } from '@/server/feedback'

export default async function HomePage() {
  const categoriesRequest = listCategories()
  const sellersRequest = listSellers({ limit: 4 })
  const [products, sellers, categories, user, sellerRatings, featuredFeedback] = await Promise.all([
    listProductsPage({ limit: 6 }, null, {
      categories: categoriesRequest,
      sellers: sellersRequest,
    }),
    sellersRequest,
    categoriesRequest,
    currentUser(),
    sellerRatingSummaries(),
    publicFeedback(),
  ])
  return (
    <SiteShell user={user}>
      <MarketplaceHome
        user={user}
        products={products.docs}
        sellers={sellers.docs}
        categories={categories.docs}
        sellerRatings={sellerRatings}
        featuredFeedback={featuredFeedback}
      />
    </SiteShell>
  )
}
