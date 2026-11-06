import Link from 'next/link'
import { removeProductAction } from '@/app/(frontend)/seller/actions'
import { DashboardShell, peso, pretty } from '@/components/dashboard-shell'
import { DashboardIcon } from '@/components/dashboard-icons'
import { AlertBanner, DashboardPanel, StatusBadge, WorkSection, workGridClass } from '@/components/dashboard-ui'
import { PagedRows } from '@/components/paged-rows'
import { ConfirmButton } from '@/components/confirm-button'
import { ProductForm } from '@/components/product-form'
import { listCategories } from '@/server/catalog'
import { requireApprovedSeller } from '@/server/guards'
import { listOwnedProducts } from '@/server/seller'
import { commissionRateFrom } from '@/server/payments'
import { readyStore } from '@/server/store'

const statusOrder = ['active', 'unavailable', 'draft', 'archived']

export default async function SellerProductsPage({ searchParams }) {
  const user = await requireApprovedSeller()
  const query = await searchParams
  const error = typeof query.error === 'string' ? query.error : ''
  const creating = query.new === '1'
  const editingId = typeof query.edit === 'string' ? query.edit : ''
  const [products, categories, store] = await Promise.all([listOwnedProducts(user), listCategories(), readyStore()])
  const commissionRate = commissionRateFrom(store)
  const editing = editingId ? products.find((product) => product.id === editingId) : null
  const known = new Set(statusOrder)
  const extra = [...new Set(products.map((product) => product.status).filter((status) => !known.has(status)))]
  const groups = [...statusOrder, ...extra]
    .map((status) => ({
      status,
      title: pretty(status),
      rows: products.filter((product) => product.status === status),
    }))
    .filter((group) => group.status === 'active' || group.rows.length)

  return (
    <DashboardShell user={user} title="Products" subtitle="Listings grouped by status. Add or edit a product on this page.">
      {error ? <div className="mb-4"><AlertBanner tone="error">{error}</AlertBanner></div> : null}
      {creating || editingId ? (
        <div className="mb-4">
          <AlertBanner tone="info">
            Platform commission notice: delivered orders may deduct ₱{commissionRate} per item from your seller payout.
            Cash pickup orders do not incur this commission.
          </AlertBanner>
        </div>
      ) : null}

      {creating || editingId ? (
        <div className="mb-4">
          <DashboardPanel
            fit
            title={editing ? 'Edit product' : 'Add product'}
            description={editing ? 'Price, stock, and how buyers can receive this listing.' : 'Set the price, stock, and whether buyers pick it up or have it delivered.'}
            action={<Link href="/seller/products" className="btn btn-secondary min-h-8 px-3 py-1 text-[13px]">Close</Link>}
          >
            {editingId && !editing ? (
              <p className="text-sm text-[#5c6f62]">This listing is not in your shop.</p>
            ) : (
              <ProductForm
                categories={categories.docs}
                product={editing || undefined}
                commissionRate={commissionRate}
              />
            )}
          </DashboardPanel>
        </div>
      ) : null}

      <div className={workGridClass}>
        {groups.map((group) => (
          <WorkSection
            key={group.status}
            title={group.title}
            description={group.status === 'active' ? 'Buyers can order these listings.' : group.status === 'unavailable' ? 'Temporarily hidden from buyers; you can reactivate them when ready.' : 'Listings in this status.'}
            count={group.rows.length}
            fit
            bodyClassName="p-4 sm:p-5"
            href={group.status === 'active' && !creating ? '/seller/products?new=1' : ''}
            linkLabel="Add product"
            linkVariant={group.status === 'active' && !creating ? 'primary' : ''}
            empty={<p className="text-sm text-[#5c6f62]">No {group.title.toLowerCase()} listings yet.</p>}
          >
            <PagedRows>
              {group.rows.map((product) => (
                <li key={product.id} className="flex flex-col items-stretch gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-[#d5e4d4] bg-[#eef0ea]">
                      {product.images?.[0]?.url ? (
                        <img src={product.images[0].url} alt={product.name} className="size-full object-cover" />
                      ) : (
                        <DashboardIcon name="box" className="size-5 text-[#78936d]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-[#142016]">{product.name}</p>
                      <p className="text-[13px] text-[#5c6f62]">
                        {peso(product.price)} / {product.unit} · {product.stock} in stock · {product.location}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <StatusBadge status={pretty(product.status)} />
                    <Link
                      href={`/seller/products?edit=${encodeURIComponent(product.id)}`}
                      aria-label={`Edit ${product.name}`}
                      title={`Edit ${product.name}`}
                      className="grid size-9 place-items-center rounded-lg border border-[#d5e4d4] text-[#2e7d32] hover:bg-[#eef8e8]"
                    >
                      <DashboardIcon name="edit" className="size-4" />
                    </Link>
                    <form action={removeProductAction}>
                      <input type="hidden" name="productId" value={product.id} />
                      <ConfirmButton
                        danger
                        confirmLabel="Remove listing"
                        message={product.status === 'archived'
                          ? 'Permanently remove this archived listing? This cannot be undone.'
                          : 'Remove this listing? Products already used in an order are archived instead of deleted.'}
                        className="grid size-9 place-items-center rounded-lg border border-red-200 text-[#963b2d] hover:bg-red-50"
                        aria-label={`Remove ${product.name}`}
                        title={`Remove ${product.name}`}
                      >
                        <DashboardIcon name="trash" className="size-4" />
                      </ConfirmButton>
                    </form>
                  </div>
                </li>
              ))}
            </PagedRows>
          </WorkSection>
        ))}
      </div>
    </DashboardShell>
  )
}
