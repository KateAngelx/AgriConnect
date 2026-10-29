import { SellerInventoryAssistant } from '@/components/seller-inventory-assistant'
import { DashboardShell, pretty } from '@/components/dashboard-shell'
import { AlertBanner, DarkButton, EmptyState, FieldInput, StatusBadge } from '@/components/dashboard-ui'
import { requireApprovedSeller } from '@/server/guards'
import { listOwnedProducts } from '@/server/seller'
import { updateStockAction } from '@/app/(frontend)/seller/actions'

export default async function InventoryPage({ searchParams }) {
  const user = await requireApprovedSeller()
  const query = await searchParams
  const error = typeof query.error === 'string' ? query.error : ''
  const products = await listOwnedProducts(user)

  return (
    <DashboardShell user={user} title="Inventory" subtitle="Update stock quantities buyers can purchase.">
      {error ? <div className="mb-6"><AlertBanner tone="error">{error}</AlertBanner></div> : null}

      <div className="mb-8">
        <SellerInventoryAssistant />
      </div>

      {products.length ? (
        <ul className="space-y-3">
          {products.map((product) => (
            <form
              key={product.id}
              action={updateStockAction}
              className="grid gap-4 rounded-2xl border border-[#173c2c]/10 bg-white p-5 shadow-sm sm:grid-cols-[1fr_120px_auto] sm:items-end"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-bold text-[#142016]">{product.name}</h2>
                  <StatusBadge status={pretty(product.status)} />
                  {product.stock < 10 ? (
                    <span className="text-xs font-bold text-[#b38a22]">Low stock</span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-[#647066]">Unit: {product.unit}</p>
              </div>
              <input type="hidden" name="productId" value={product.id} />
              <FieldInput
                aria-label={`${product.name} stock`}
                name="stock"
                type="number"
                min="0"
                step="1"
                defaultValue={product.stock}
              />
              <DarkButton type="submit">Update</DarkButton>
            </form>
          ))}
        </ul>
      ) : (
        <EmptyState title="No inventory">Add products first, then update quantities here.</EmptyState>
      )}
    </DashboardShell>
  )
}
