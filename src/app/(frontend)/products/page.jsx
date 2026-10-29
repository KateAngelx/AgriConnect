import { MarketplaceAssistant } from '@/components/marketplace-assistant'
import { ProductCard } from '@/components/product-card'
import { SiteShell } from '@/components/site-shell'
import { listCategories, listProducts } from '@/server/catalog'

export default async function ProductsPage({ searchParams }) {
  const query = await searchParams
  const search = typeof query.q === 'string' ? query.q.trim() : ''
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
        <section className="border-b border-[#173c2c]/10 bg-[#e9eddc]">
          <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
            <p className="page-eyebrow text-[#4f8d3b]">Marketplace</p>
            <h1 className="page-title mt-2 text-4xl sm:text-5xl">Shop agricultural products</h1>
            <p className="page-lead mt-4 max-w-2xl text-[#65766d]">
              Browse active listings from approved local sellers. Sign in is required only when you
              are ready to purchase.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-5 pt-8 lg:px-8">
          <MarketplaceAssistant />
        </div>
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 lg:grid-cols-[260px_1fr] lg:px-8">
          <aside>
            <form className="space-y-5 rounded-3xl border border-[#173c2c]/10 bg-white p-5">
              <div>
                <label htmlFor="q" className="text-sm font-semibold">
                  Search products
                </label>
                <input
                  id="q"
                  name="q"
                  defaultValue={search}
                  placeholder="Tomatoes, rice, herbs"
                  className="mt-2 w-full rounded-xl border border-[#173c2c]/15 bg-[#faf9f4] px-4 py-3 outline-none focus:border-[#4f8d3b]"
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
                  className="mt-2 w-full rounded-xl border border-[#173c2c]/15 bg-[#faf9f4] px-4 py-3"
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
                  className="mt-2 w-full rounded-xl border border-[#173c2c]/15 bg-[#faf9f4] px-4 py-3"
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
              <button className="w-full rounded-full bg-[#173c2c] px-5 py-3 font-semibold text-white">
                Apply filters
              </button>
            </form>
          </aside>

          <section>
            <div className="mb-6 flex items-center justify-between gap-4">
              <p className="text-sm text-[#65766d]">
                {products.totalDocs} product{products.totalDocs === 1 ? '' : 's'} found
              </p>
              <form>
                {search ? <input type="hidden" name="q" value={search} /> : null}
                {category ? <input type="hidden" name="category" value={category} /> : null}
                {typeof query.fulfillment === 'string' && query.fulfillment ? (
                  <input type="hidden" name="fulfillment" value={query.fulfillment} />
                ) : null}
                {query.available === 'true' ? <input type="hidden" name="available" value="true" /> : null}
                <select
                  name="sort"
                  defaultValue={sort}
                  className="rounded-full border border-[#173c2c]/15 bg-white px-4 py-2 text-sm"
                  aria-label="Sort products"
                >
                  <option value="-createdAt">Newest</option>
                  <option value="price">Price: Low to High</option>
                  <option value="-price">Price: High to Low</option>
                </select>
                <button className="ml-2 rounded-full border border-[#173c2c]/15 px-3 py-2 text-sm">
                  Sort
                </button>
              </form>
            </div>

            {products.docs.length ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {products.docs.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-[#173c2c]/20 bg-white p-12 text-center">
                <h2 className="text-xl font-semibold">No products match your filters.</h2>
                <p className="mt-2 text-[#65766d]">Try a different category or broader search.</p>
              </div>
            )}

            {products.totalPages > 1 && (
              <nav className="mt-10 flex justify-center gap-2" aria-label="Pagination">
                {Array.from({ length: products.totalPages }, (_, index) => (
                  <a
                    key={index}
                    href={withParams({ page: index + 1 })}
                    className={`grid size-10 place-items-center rounded-full ${page === index + 1 ? 'bg-[#173c2c] text-white' : 'border border-[#173c2c]/15 bg-white'}`}
                  >
                    {index + 1}
                  </a>
                ))}
              </nav>
            )}
          </section>
        </div>
      </main>
    </SiteShell>
  )
}