import { MarketplaceAssistant } from '@/components/marketplace-assistant'
import { ProductSort } from '@/components/product-sort'
import { ProductResults } from '@/components/product-results'
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
  const sort = typeof query.sort === 'string' ? query.sort : 'all'
  const page = Math.max(1, Number(query.page) || 1)
  const filterParams = new URLSearchParams()
  if (search) filterParams.set('q', search)
  if (category) filterParams.set('category', category)
  if (typeof query.fulfillment === 'string' && query.fulfillment)
    filterParams.set('fulfillment', query.fulfillment)
  if (query.available === 'true') filterParams.set('available', 'true')
  if (sort !== '-createdAt') filterParams.set('sort', sort)
  const categoriesRequest = listCategories()
  const productsRequest = listProductsPage(
    {
      search,
      category,
      sort: sort === 'price' || sort === '-price' ? sort : '-createdAt',
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
          <div className="grid gap-6 lg:grid-cols-[16rem_1fr] lg:gap-8">
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <form className="ui-card space-y-5 p-5">
                <div>
                  <label htmlFor="q" className="text-sm font-semibold">
                    Search products
                  </label>
                  <input
                    id="q"
                    name="q"
                    defaultValue={search}
                    placeholder="Tomatoes, rice, herbs"
                    className="ui-field mt-2"
                  />
                </div>
                <div>
                  <label htmlFor="category" className="text-sm font-semibold">
                    Category
                  </label>
                  <select
                    id="category"
                    name="category"
                    defaultValue={category || 'all'}
                    className="ui-field mt-2"
                  >
                    <option value="all">All products</option>
                    {categories.docs.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="fulfillment" className="text-sm font-semibold">
                    Fulfillment
                  </label>
                  <select
                    id="fulfillment"
                    name="fulfillment"
                    defaultValue={typeof query.fulfillment === 'string' ? query.fulfillment : ''}
                    className="ui-field mt-2"
                  >
                    <option value="">Pickup or delivery</option>
                    <option value="pickup">Pickup</option>
                    <option value="delivery">Delivery</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="available"
                    value="true"
                    defaultChecked={query.available === 'true'}
                  />{' '}
                  In stock only
                </label>
                <button className="btn btn-dark btn-block">Apply filters</button>
              </form>
            </aside>

            <div className="space-y-4">
              <ProductSort
                search={search}
                category={category}
                fulfillment={typeof query.fulfillment === 'string' ? query.fulfillment : ''}
                available={query.available === 'true'}
                sort={sort}
              />
              <ProductResults
                key={filterParams.toString()}
                initialProducts={products.docs}
                totalDocs={products.totalDocs}
                totalPages={products.totalPages}
                initialPage={page}
                search={search}
                baseParams={filterParams.toString()}
              />
            </div>
          </div>
        </div>
      </main>
    </SiteShell>
  )
}
