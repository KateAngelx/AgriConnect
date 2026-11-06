import { DashboardShell, pretty } from '@/components/dashboard-shell'
import { AlertBanner, DarkButton, FieldInput, StatusBadge, WorkSection, workStackClass } from '@/components/dashboard-ui'
import { PagedRows } from '@/components/paged-rows'
import { requireApprovedSeller } from '@/server/guards'
import { listOwnedProducts } from '@/server/seller'
import { updateStockAction } from '@/app/(frontend)/seller/actions'

export default async function InventoryPage({ searchParams }) {
  const user = await requireApprovedSeller()
  const query = await searchParams
  const error = typeof query.error === 'string' ? query.error : ''
  const products = await listOwnedProducts(user)

  return (
    <DashboardShell user={user} title="Inventory" subtitle="Stock quantities buyers can purchase.">
      {error ? <div className="mb-6"><AlertBanner tone="error">{error}</AlertBanner></div> : null}

      <div className={workStackClass}>
        <WorkSection
          title="Stock"
          description="Update how much buyers can still purchase."
          count={products.length}
          fit
          empty={<p className="text-sm text-[#5c6f62]">Add products first, then update quantities here.</p>}
        >
          <PagedRows>
          {products.map((product) => (
            <li key={product.id}>
            <form
              action={updateStockAction}
              className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_7rem_auto] sm:items-end"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-bold text-[#142016]">{product.name}</h2>
                  <StatusBadge status={pretty(product.status)} />
                  {product.stock <= 0 ? (
                    <span className="text-xs font-semibold text-red-800">Out of stock</span>
                  ) : product.stock < 10 ? (
                    <span className="text-xs font-semibold text-amber-800">Low stock</span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-brand-muted">Unit: {product.unit}</p>
                <input type="hidden" name="productId" value={product.id} />
              </div>
              <div>
                <label htmlFor={`stock-${product.id}`} className="mb-1 block text-xs font-semibold text-brand-muted">
                  Stock
                </label>
                <FieldInput
                  id={`stock-${product.id}`}
                  name="stock"
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={product.stock}
                />
              </div>
              <DarkButton type="submit">Save stock</DarkButton>
            </form>
            </li>
          ))}
          </PagedRows>
        </WorkSection>
      </div>
    </DashboardShell>
  )
}
