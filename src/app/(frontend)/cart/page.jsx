import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard-shell'
import { currentUser } from '@/server/auth'
import { getCart } from '@/server/cart'
import { updateCartAction } from '@/app/(frontend)/cart/actions'
import { peso } from '@/lib/dashboard-format'
import { DashboardIcon } from '@/components/dashboard-icons'
import { authHref } from '@/lib/auth-links'
export default async function CartPage() {
  const user = await currentUser()
  if (!user) redirect(authHref('login', '/cart'))
  const { isApprovedBuyer } = await import('@/server/roles')
  if (!isApprovedBuyer(user)) redirect('/products')
  const cart = await getCart(user.id)
  const items = cart?.items?.filter((item) => typeof item.product === 'object') ?? []
  const eligibleItems = items.filter(
    (item) =>
      item.product.status === 'active' &&
      item.product.seller?.status === 'approved' &&
      item.product.stock > 0 &&
      item.quantity <= item.product.stock,
  )
  const subtotal = items.reduce(
    (sum, item) =>
      sum + (eligibleItems.includes(item) ? item.product.price * item.quantity : 0),
    0,
  )
  const sellerCount = new Set(eligibleItems.map((item) => item.product.seller?.id).filter(Boolean)).size
  const deliveryEstimate = subtotal + sellerCount * 49
  const canCheckout = items.length > 0 && eligibleItems.length === items.length
  return (
    <DashboardShell user={user} title="Cart" subtitle="Review quantities before checkout.">
        {items.length ? (
          <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
            <section className="space-y-4">
              {items.map((item, index) => {
                const product = typeof item.product === 'object' ? item.product : null
                if (!product) return null
                const available = product.status === 'active' && product.seller?.status === 'approved'
                const inStock = available && product.stock > 0
                const exceedsStock = inStock && item.quantity > product.stock
                return (
                  <article
                    key={item.id ?? `${product.id}-${index}`}
                    className="ui-card flex flex-col gap-5 p-5 sm:flex-row sm:items-center"
                  >
                    <div className="flex-1">
                      <p className={`text-xs font-bold uppercase ${inStock ? 'text-[#5dbb38]' : 'text-[#963b2d]'}`}>
                        {!available ? 'Unavailable' : product.stock > 0 ? `${product.stock} available` : 'Out of stock'}
                      </p>
                      <h2 className="mt-2 text-xl font-bold">{product.name}</h2>
                      <p className="mt-1 text-sm text-[#647066]">
                        Seller: {product.seller?.farmName || 'Local seller'}
                      </p>
                      <p className="mt-1 text-sm text-[#647066]">
                        {peso(product.price)} / {product.unit}
                        {product.stock <= 0 ? ' · Sold out' : product.stock < 10 ? ' · Low stock' : ''}
                      </p>
                      {exceedsStock ? (
                        <p className="mt-1 text-xs font-semibold text-[#963b2d]">
                          Only {product.stock} available. Update the quantity to continue.
                        </p>
                      ) : null}
                    </div>
                    {inStock ? (
                      <form action={updateCartAction} className="flex items-center gap-2">
                        <input type="hidden" name="cartID" value={cart.id} />
                        <input type="hidden" name="itemID" value={item.id ?? ''} />
                        <input
                          aria-label={`Quantity for ${product.name}`}
                          name="quantity"
                          type="number"
                          min="1"
                          max={product.stock}
                          defaultValue={Math.min(item.quantity, product.stock)}
                          className="w-20 rounded-xl border border-black/10 px-3 py-2"
                        />
                        <button className="btn btn-secondary">Update</button>
                      </form>
                    ) : null}
                    <form action={updateCartAction}>
                      <input type="hidden" name="cartID" value={cart.id} />
                      <input type="hidden" name="itemID" value={item.id ?? ''} />
                      <input type="hidden" name="quantity" value="0" />
                      <button className="btn btn-danger !size-9 !min-h-9 !p-0" aria-label={`Remove ${product.name} from cart`} title="Remove from cart">
                        <DashboardIcon name="trash" className="size-4" />
                      </button>
                    </form>
                    <p className="w-28 text-right text-lg font-bold">
                      {inStock && !exceedsStock ? peso(product.price * item.quantity) : '—'}
                    </p>
                  </article>
                )
              })}
            </section>
            <aside className="ui-card h-fit p-5">
              <h2 className="text-[17px] font-semibold">Order summary</h2>
              <div className="mt-4 flex justify-between border-b border-[#e5e5ea] pb-4 text-[13px]">
                <span className="text-[#6e6e73]">Subtotal</span>
                <strong>{peso(subtotal)}</strong>
              </div>
              <div className="mt-4 space-y-2 text-[13px]">
                <div className="flex justify-between">
                  <span className="text-[#6e6e73]">Pickup total</span>
                  <strong>{peso(subtotal)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6e6e73]">Delivery estimate ({sellerCount} seller{sellerCount === 1 ? '' : 's'})</span>
                  <strong>{peso(deliveryEstimate)}</strong>
                </div>
              </div>
              {!canCheckout ? (
                <p className="mt-3 text-xs leading-5 text-[#963b2d]">
                  Unavailable products and quantities above current stock are excluded from totals. Remove or update them before checkout.
                </p>
              ) : null}
              <p className="mt-4 text-[12px] leading-5 text-[#6e6e73]">
                Delivery is charged per seller order. Final stock and fees are confirmed at checkout.
              </p>
              {canCheckout ? (
                <a href="/checkout" className="btn btn-primary mt-6 w-full">
                  Continue to checkout
                </a>
              ) : (
                <span className="btn btn-primary mt-6 w-full cursor-not-allowed opacity-50" aria-disabled="true">
                  Update cart to continue
                </span>
              )}
            </aside>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-brand-800/15 bg-white px-6 py-14 text-center">
            <h2 className="text-xl font-bold text-brand-900">Your cart is empty</h2>
            <p className="mt-2 text-brand-muted">Browse active products and add the items you want.</p>
            <a href="/products" className="btn btn-primary mt-6">
              Browse products
            </a>
          </div>
        )}
    </DashboardShell>
  )
}
