import Link from 'next/link'
import { removeProductAction } from '@/app/(frontend)/seller/actions'
import { DashboardShell, peso, pretty } from '@/components/dashboard-shell'
import { AlertBanner, EmptyState, ListRow, PrimaryLink, StatusBadge } from '@/components/dashboard-ui'
import { ConfirmButton } from '@/components/confirm-button'
import { Modal } from '@/components/modal'
import { ProductForm } from '@/components/product-form'
import { listCategories } from '@/server/catalog'
import { requireApprovedSeller } from '@/server/guards'
import { listOwnedProducts } from '@/server/seller'

export default async function SellerProductsPage({ searchParams }) {
  const user = await requireApprovedSeller()
  const query = await searchParams
  const error = typeof query.error === 'string' ? query.error : ''
  const creating = query.new === '1'
  const editingId = typeof query.edit === 'string' ? query.edit : ''
  const [products, categories] = await Promise.all([listOwnedProducts(user), listCategories()])
  const editing = editingId ? products.find((product) => product.id === editingId) : null
  const modalOpen = creating || Boolean(editingId)

  return (
    <DashboardShell user={user} title="Products" subtitle="Listings buyers can order from your shop.">
      {error ? <div className="mb-6"><AlertBanner tone="error">{error}</AlertBanner></div> : null}

      <div className="mb-6 flex justify-end">
        <PrimaryLink href="/seller/products?new=1">Add product</PrimaryLink>
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
                  <Link href={`/seller/products?edit=${encodeURIComponent(product.id)}`} className="btn btn-secondary">
                    Edit
                  </Link>
                  <form action={removeProductAction}>
                    <input type="hidden" name="productId" value={product.id} />
                    <ConfirmButton
                      danger
                      confirmLabel="Remove listing"
                      message="Remove this listing? Products already used in an order are archived instead of deleted."
                      className="btn btn-danger"
                    >
                      Remove
                    </ConfirmButton>
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
            <PrimaryLink href="/seller/products?new=1">Add product</PrimaryLink>
          }
        >
          Publish produce after your seller account is approved.
        </EmptyState>
      )}

      {modalOpen ? (
        <Modal
          title={editing ? 'Edit product' : 'Add product'}
          subtitle={editing ? 'Price, stock, and how buyers can receive this listing.' : 'Set the price, stock, and whether buyers pick it up or have it delivered.'}
          closeHref="/seller/products"
        >
          {editingId && !editing ? (
            <p className="text-sm text-[#5c6f62]">This listing is not in your shop.</p>
          ) : (
            <ProductForm categories={categories.docs} product={editing || undefined} />
          )}
        </Modal>
      ) : null}
    </DashboardShell>
  )
}
