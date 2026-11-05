import Link from 'next/link'
import { deactivateProductAction } from '@/app/(frontend)/admin/actions'
import { DashboardShell, peso, pretty } from '@/components/dashboard-shell'
import { AlertBanner, StatusBadge } from '@/components/dashboard-ui'
import { ConfirmButton } from '@/components/confirm-button'
import { AdminAiAssist } from '@/components/admin-ai-assist'
import { PagedRows } from '@/components/paged-rows'
import { requireAdmin } from '@/server/guards'
import { listProductsForAdmin } from '@/server/admin'

const statuses = ['all', 'active', 'unavailable', 'draft', 'archived']

export default async function AdminProductsPage({ searchParams }) {
  const user = await requireAdmin()
  const query = await searchParams
  const search = typeof query.q === 'string' ? query.q.trim() : ''
  const status = statuses.includes(query.status) ? query.status : 'all'
  const sellerId = typeof query.seller === 'string' ? query.seller : 'all'
  const allProducts = await listProductsForAdmin()
  const sellers = [
    ...new Map(
      allProducts.map((product) => [
        product.sellerId,
        { id: product.sellerId, name: product.seller },
      ]),
    ).values(),
  ].filter((seller) => seller.id)
  const normalizedSearch = search.toLocaleLowerCase()
  const products = allProducts.filter((product) => {
    const matchesSearch =
      !normalizedSearch ||
      [product.name, product.seller, product.id, product.category].some((value) =>
        String(value || '')
          .toLocaleLowerCase()
          .includes(normalizedSearch),
      )
    return (
      matchesSearch &&
      (status === 'all' || product.status === status) &&
      (sellerId === 'all' || product.sellerId === sellerId)
    )
  })

  return (
    <DashboardShell
      user={user}
      title="Product monitoring"
      subtitle="Review marketplace listings and reported products. Seller accounts remain responsible for ordinary product edits and inventory."
    >
      {typeof query.error === 'string' ? (
        <div className="mb-4">
          <AlertBanner tone="error">{query.error}</AlertBanner>
        </div>
      ) : null}
      {typeof query.success === 'string' ? (
        <div className="mb-4">
          <AlertBanner tone="success">{query.success}</AlertBanner>
        </div>
      ) : null}

      <form
        method="get"
        className="ui-card mb-4 grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_12rem_16rem_auto] sm:items-end"
      >
        <label className="grid gap-1 text-sm font-medium text-brand-900">
          Search listings
          <input
            type="search"
            name="q"
            defaultValue={search}
            placeholder="Product, seller, category, or ID"
            className="min-h-11 rounded-xl border border-brand-line bg-white px-3"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-brand-900">
          Status
          <select
            name="status"
            defaultValue={status}
            className="min-h-11 rounded-xl border border-brand-line bg-white px-3"
          >
            {statuses.map((value) => (
              <option key={value} value={value}>
                {value === 'all' ? 'All statuses' : pretty(value)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-brand-900">
          Seller
          <select
            name="seller"
            defaultValue={sellerId}
            className="min-h-11 rounded-xl border border-brand-line bg-white px-3"
          >
            <option value="all">All sellers</option>
            {sellers.map((seller) => (
              <option key={seller.id} value={seller.id}>
                {seller.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn btn-primary">
          Filter listings
        </button>
      </form>

      <section className="ui-card overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-brand-line px-4 py-3 sm:px-5">
          <div>
            <h2 className="text-lg font-semibold text-brand-900">Marketplace products</h2>
            <p className="text-sm text-brand-muted">
              {products.length} of {allProducts.length} listings
            </p>
          </div>
          {search || status !== 'all' || sellerId !== 'all' ? (
            <Link href="/admin/products" className="text-sm font-semibold text-brand-700">
              Clear filters
            </Link>
          ) : null}
        </div>
        {products.length ? (
          <PagedRows className="divide-y divide-brand-line">
            {products.map((product) => {
              const image = product.images[0]?.url
              return (
                <li key={product.id} className="px-4 py-4 sm:px-5">
                  <div className="grid gap-3 sm:grid-cols-[4.5rem_minmax(0,1fr)_auto] sm:items-center">
                    <div className="grid size-[4.5rem] place-items-center overflow-hidden rounded-xl bg-brand-page text-center text-xs text-brand-muted">
                      {image ? (
                        <img src={image} alt="" className="h-full w-full object-cover" />
                      ) : (
                        'No image'
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-brand-900">{product.name}</h3>
                      <p className="text-sm text-brand-muted">
                        {product.seller} · {peso(product.price)}
                        {product.unit ? ` / ${product.unit}` : ''}
                      </p>
                      <p className="mt-1 text-sm text-brand-muted">
                        {product.stock} in stock · {product.category || 'Uncategorized'}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={pretty(product.status)} />
                      {product.status === 'active' ? (
                        <form action={deactivateProductAction}>
                          <input type="hidden" name="productId" value={product.id} />
                          <ConfirmButton
                            danger
                            message={`Deactivate ${product.name}? Buyers will no longer be able to purchase it. The seller can still manage their listing.`}
                            className="btn btn-danger"
                          >
                            Deactivate
                          </ConfirmButton>
                        </form>
                      ) : null}
                    </div>
                  </div>
                  <details className="mt-3">
                    <summary className="w-fit cursor-pointer text-sm font-semibold text-brand-700">
                      View product details and reports
                    </summary>
                    <div className="mt-3 rounded-xl bg-[#f7fbf4] p-4">
                      <p className="whitespace-pre-wrap text-sm leading-6 text-brand-900">
                        {product.description || 'No description provided.'}
                      </p>
                      <p className="mt-2 text-xs text-brand-muted">
                        Listing ID: {product.id}
                        {product.createdAt
                          ? ` · Added ${new Date(product.createdAt).toLocaleDateString('en-PH')}`
                          : ''}
                      </p>
                      <p className="mt-2 text-sm text-brand-muted">
                        {product.reportedCount
                          ? `${product.reportedCount} product report${product.reportedCount === 1 ? '' : 's'} submitted.`
                          : 'No product reports.'}
                        {product.reportedCount ? (
                          <>
                            {' '}
                            <Link
                              href={`/admin/buyer-reports?targetId=${encodeURIComponent(product.id)}`}
                              className="font-semibold text-brand-700"
                            >
                              Review reports
                            </Link>
                          </>
                        ) : null}
                      </p>
                      <AdminAiAssist
                        kind="product"
                        recordId={product.id}
                        label="AI listing review"
                      />
                    </div>
                  </details>
                </li>
              )
            })}
          </PagedRows>
        ) : (
          <p className="p-6 text-sm text-brand-muted">No products match these filters.</p>
        )}
      </section>
    </DashboardShell>
  )
}
