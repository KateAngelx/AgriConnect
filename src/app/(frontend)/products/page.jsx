import { MarketplaceAssistant } from '@/components/marketplace-assistant'
import { ProductCard } from '@/components/product-card'
import { ProductSort } from '@/components/product-sort'
import { SiteShell } from '@/components/site-shell'
import { listCategories, listProducts } from '@/server/catalog'

export default async function ProductsPage({ searchParams }) {
  const query = await searchParams
  const search = (typeof query.q === 'string' ? query.q : typeof query.search === 'string' ? query.search : '').trim()
  const category = typeof query.category === 'string' ? query.category : ''
  const sort = typeof query.sort === 'string' ? query.sort : '-createdAt'
  const page = Math.max(1, Number(query.page) || 1)
  const filterParams = new URLSearchParams()
  if (search) filterParams.set('q', search)
  if (category) filterParams.set('category', category)
  if (typeof query.fulfillment === 'string' && query.fulfillment) filterParams.set('fulfillment', query.fulfillment)
  if (query.available === 'true') filterParams.set('available', 'true')
  if (sort !== '-createdAt') filterParams.set('sort', sort)
  const withParams = (values) => {
    const params = new URLSearchParams(filterParams)
    Object.entries(values).forEach(([key, value]) => {
      if (value) params.set(key, String(value))
      else params.delete(key)
    })
    const queryString = params.toString()
    return queryString ? `/products?${queryString}` : '/products'
  }

  const [products, categories] = await Promise.all([
    listProducts({
      search,
      category,
      sort: sort === 'price' || sort === '-price' ? sort : '-createdAt',
      page,
      fulfillment: query.fulfillment,
      available: query.available === 'true',
    }),
    listCategories(),
  ])

  return (
    <SiteShell>
      <main>
        <section className="page-band">
          <div className="page-container">
            <p className="page-eyebrow text-brand-700">Marketplace</p>
            <h1 className="page-title mt-2 text-3xl text-brand-900 sm:text-4xl">Shop agricultural products</h1>
            <p className="page-lead mt-3 max-w-2xl text-brand-muted">
              Browse active listings from approved local sellers. Sign in only when you are ready to purchase.
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
                  defaultValue={category}
                  className="ui-field mt-2"
                >
                  <option value="">All products</option>
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

          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-brand-muted">
                {products.totalDocs === 1 ? '1 product' : `${products.totalDocs} products`}
                {search ? ` for “${search}”` : ''}
              </p>
              <ProductSort
                search={search}
                category={category}
                fulfillment={typeof query.fulfillment === 'string' ? query.fulfillment : ''}
                available={query.available === 'true'}
                sort={sort}
              />
            </div>

            {products.docs.length ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {products.docs.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="page-empty">
                <h2 className="text-xl font-semibold text-brand-900">No products match these filters</h2>
                <p className="mt-2 text-brand-muted">Try another category, or clear the search to see every active listing.</p>
                <a href="/products" className="btn btn-secondary mt-5">Clear filters</a>
              </div>
            )}

            {products.totalPages > 1 && (
              <nav className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label="Pagination">
                {page > 1 ? (
                  <a href={withParams({ page: page - 1 })} className="btn btn-secondary" rel="prev">
                    Previous
                  </a>
                ) : (
                  <span className="btn btn-secondary opacity-40">Previous</span>
                )}
                {Array.from({ length: products.totalPages }, (_, index) => {
                  const number = index + 1
                  const current = page === number
                  return (
                    <a
                      key={number}
                      href={withParams({ page: number })}
                      aria-label={`Page ${number}`}
                      aria-current={current ? 'page' : undefined}
                      className={`grid size-9 place-items-center rounded-lg text-[13px] font-semibold ${current ? 'bg-[#1d1d1f] text-white' : 'bg-white text-[#1d1d1f] ring-1 ring-[#e5e5ea]'}`}
                    >
                      {number}
                    </a>
                  )
                })}
                {page < products.totalPages ? (
                  <a href={withParams({ page: page + 1 })} className="btn btn-secondary" rel="next">
                    Next
                  </a>
                ) : (
                  <span className="btn btn-secondary opacity-40">Next</span>
                )}
              </nav>
            )}
          </section>
        </div>
        </div>
      </main>
    </SiteShell>
  )
}