import Link from 'next/link'
import { removeProductAction } from '@/app/(frontend)/seller/actions'
import { DashboardShell, peso, pretty } from '@/components/dashboard-shell'
import { AlertBanner, DashboardPanel, StatusBadge, WorkSection, workGridClass } from '@/components/dashboard-ui'
import { PagedRows } from '@/components/paged-rows'
import { ConfirmButton } from '@/components/confirm-button'
import { ProductForm } from '@/components/product-form'
import { listCategories } from '@/server/catalog'
import { requireApprovedSeller } from '@/server/guards'
import { listOwnedProducts } from '@/server/seller'

const statusOrder = ['active', 'draft', 'archived']

export default async function SellerProductsPage({ searchParams }) {
  const user = await requireApprovedSeller()
  const query = await searchParams
  const error = typeof query.error === 'string' ? query.error : ''
  const creating = query.new === '1'
  const editingId = typeof query.edit === 'string' ? query.edit : ''
  const [products, categories] = await Promise.all([listOwnedProducts(user), listCategories()])
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
          <DashboardPanel
            fit
            title={editing ? 'Edit product' : 'Add product'}
            description={editing ? 'Price, stock, and how buyers can receive this listing.' : 'Set the price, stock, and whether buyers pick it up or have it delivered.'}
            action={<Link href="/seller/products" className="text-sm font-bold text-[#4f8d3b]">Close</Link>}
          >
            {editingId && !editing ? (
              <p className="text-sm text-[#5c6f62]">This listing is not in your shop.</p>
            ) : (
              <ProductForm categories={categories.docs} product={editing || undefined} />
            )}
          </DashboardPanel>
        </div>
      ) : null}

      <div className={workGridClass}>
        {groups.map((group) => (
          <WorkSection
            key={group.status}
            title={group.title}
            description={group.status === 'active' ? 'Buyers can order these listings.' : 'Listings in this status.'}
            count={group.rows.length}
            href={group.status === 'active' && !creating ? '/seller/products?new=1' : ''}
            linkLabel="Add product"
            empty={<p className="text-sm text-[#5c6f62]">No {group.title.toLowerCase()} listings yet.</p>}
          >
            <PagedRows>
              {group.rows.map((product) => (
                <li key={product.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-[#142016]">{product.name}</p>
                    <p className="text-[13px] text-[#5c6f62]">
                      {peso(product.price)} / {product.unit} · {product.stock} in stock · {product.location}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <StatusBadge status={pretty(product.status)} />
                    <Link href={`/seller/products?edit=${encodeURIComponent(product.id)}`} className="text-sm font-bold text-[#4f8d3b]">
                      Edit
                    </Link>
                    <form action={removeProductAction}>
                      <input type="hidden" name="productId" value={product.id} />
                      <ConfirmButton
                        danger
                        confirmLabel="Remove listing"
                        message="Remove this listing? Products already used in an order are archived instead of deleted."
                        className="text-sm font-bold text-[#963b2d]"
                      >
                        Remove
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
