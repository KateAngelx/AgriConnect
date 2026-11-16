import { MarketplaceAssistant } from '@/components/marketplace-assistant'
import { ProductBrowser } from '@/components/product-browser'
import { SiteShell } from '@/components/site-shell'
import { listCategories, listProductsPage } from '@/server/catalog'

export default async function ProductsPage({ searchParams }) {
  const query = await searchParams
  const search = (
    typeof query.q === 'string' ? query.q : typeof query.search === 'string' ? query.search : ''
  ).trim()
  const categoryValue =
    typeof query.category === 'string' ? query.category.trim().toLowerCase() : ''
  const category = categoryValue === '' || categoryValue === 'all' ? '' : categoryValue
  const sort = query.sort === 'price' || query.sort === '-price' ? query.sort : '-createdAt'
  const page = Math.max(1, Number(query.page) || 1)
  const categoriesRequest = listCategories()
  const productsRequest = listProductsPage(
    {
      search,
      category,
      sort,
      page,
      limit: 12,
      fulfillment: query.fulfillment,
      available: query.available === 'true',
    },
    null,
    { categories: categoriesRequest },
  )
  const [products, categories] = await Promise.all([productsRequest, categoriesRequest])

  return (
    <SiteShell>
      <main>
        <section className="page-band">
          <div className="page-container">
            <p className="page-eyebrow text-brand-700">Marketplace</p>
            <h1 className="page-title mt-2 text-3xl text-brand-900 sm:text-4xl">
              Shop agricultural products
            </h1>
            <p className="page-lead mt-3 max-w-2xl text-brand-muted">
              Browse active listings from approved local sellers. Sign in only when you are ready to
              purchase.
            </p>
          </div>
        </section>

        <div className="page-container page-section space-y-6">
          <MarketplaceAssistant />
          <ProductBrowser
            categories={categories.docs}
            initial={{
              search,
              category,
              fulfillment: typeof query.fulfillment === 'string' ? query.fulfillment : '',
              available: query.available === 'true',
              sort,
              page,
              products: products.docs,
              totalDocs: products.totalDocs,
              totalPages: products.totalPages,
            }}
          />
        </div>
      </main>
    </SiteShell>
  )
}
