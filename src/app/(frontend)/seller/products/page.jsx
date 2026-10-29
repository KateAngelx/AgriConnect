import Link from 'next/link'
import { DashboardShell, peso, pretty } from '@/components/dashboard-shell'
import { AlertBanner, EmptyState, ListRow, PrimaryButton, StatusBadge } from '@/components/dashboard-ui'
import { requireApprovedSeller } from '@/server/guards'
import { listOwnedProducts } from '@/server/seller'
import { removeProductAction } from '@/app/(frontend)/seller/actions'

export default async function SellerProductsPage({ searchParams }) {
  const user = await requireApprovedSeller()
  const query = await searchParams
  const error = typeof query.error === 'string' ? query.error : ''
  const products = await listOwnedProducts(user)

  return (
    <DashboardShell user={user} title="Products" subtitle="Create, edit, and remove your marketplace listings.">
      {error ? <div className="mb-6"><AlertBanner tone="error">{error}</AlertBanner></div> : null}

      <div className="mb-6 flex justify-end">
        <Link href="/seller/products/new" className="inline-flex rounded-full bg-[#5dbb38] px-5 py-2.5 text-sm font-bold text-white hover:opacity-90">
          New product
        </Link>
      </div>

      {products.length ? (
        <ul className="space-y-3">
          {products.map((product) => (
            <ListRow
              key={product.id}
              badge={<StatusBadge status={pretty(product.status)} />}
              title={product.name}
              meta={`${peso(product.price)} / ${product.unit} · ${product.stock} in stock · ${product.location}`}
              actions={
                <>
                  <Link
                    href={`/seller/products/${product.id}`}
                    className="inline-flex rounded-full border border-[#173c2c]/15 bg-white px-5 py-2.5 text-sm font-bold text-[#142016] hover:bg-[#f7f7f2]"
                  >
                    Edit
                  </Link>
                  <form action={removeProductAction}>
                    <input type="hidden" name="productId" value={product.id} />
                    <button type="submit" className="rounded-full bg-[#fff1ed] px-5 py-2.5 text-sm font-bold text-[#963b2d]">
                      Remove
                    </button>
                  </form>
                </>
              }
            />
          ))}
        </ul>
      ) : (
        <EmptyState
          title="No products yet"
          action={
            <Link href="/seller/products/new">
              <PrimaryButton type="button">Create listing</PrimaryButton>
            </Link>
          }
        >
          Publish produce after your seller account is approved.
        </EmptyState>
      )}
    </DashboardShell>
  )
}
