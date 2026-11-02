import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard-shell'
import { currentUser } from '@/server/auth'
import { getCart } from '@/server/cart'
import { updateCartAction } from '@/app/(frontend)/cart/actions'
import { peso } from '@/lib/dashboard-format'
export default async function CartPage() {
  const user = await currentUser()
  if (!user) redirect('/login')
  const { isApprovedBuyer } = await import('@/server/roles')
  if (!isApprovedBuyer(user)) redirect('/products')
  const cart = await getCart(user.id)
  const items = cart?.items?.filter((item) => typeof item.product === 'object') ?? []
  const subtotal = items.reduce(
    (sum, item) =>
      sum + (typeof item.product === 'object' ? item.product.price * item.quantity : 0),
    0,
  )
  return (
    <DashboardShell user={user} title="Cart" subtitle="Review quantities before checkout.">
        {items.length ? (
          <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
            <section className="space-y-4">
              {items.map((item, index) => {
                const product = typeof item.product === 'object' ? item.product : null
                if (!product) return null
                return (
                  <article
                    key={item.id ?? `${product.id}-${index}`}
                    className="ui-card flex flex-col gap-5 p-5 sm:flex-row sm:items-center"
                  >
                    <div className="flex-1">
                      <p className="text-xs font-bold uppercase text-[#5dbb38]">
                        {product.stock > 0 ? `${product.stock} available` : 'Out of stock'}
                      </p>
                      <h2 className="mt-2 text-xl font-bold">{product.name}</h2>
                      <p className="mt-1 text-sm text-[#647066]">
                        {peso(product.price)} / {product.unit}
                        {product.stock <= 0 ? ' · Sold out' : product.stock < 10 ? ' · Low stock' : ''}
                      </p>
                    </div>
                    <form action={updateCartAction} className="flex items-center gap-2">
                      <input type="hidden" name="cartID" value={cart.id} />
                      <input type="hidden" name="itemID" value={item.id ?? ''} />
                      <input
                        aria-label={`Quantity for ${product.name}`}
                        name="quantity"
                        type="number"
                        min="0"
                        max={product.stock}
                        defaultValue={item.quantity}
                        className="w-20 rounded-xl border border-black/10 px-3 py-2"
                      />
                      <button className="btn btn-secondary">Update</button>
                    </form>
                    <form action={updateCartAction}>
                      <input type="hidden" name="cartID" value={cart.id} />
                      <input type="hidden" name="itemID" value={item.id ?? ''} />
                      <input type="hidden" name="quantity" value="0" />
                      <button className="btn btn-danger">Remove</button>
                    </form>
                    <p className="w-28 text-right text-lg font-bold">
                      {peso(product.price * item.quantity)}
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
              <p className="mt-4 text-[12px] leading-5 text-[#6e6e73]">
                Delivery fees and final stock are validated during checkout.
              </p>
              <a
                href="/checkout"
                className="btn btn-primary mt-6 w-full"
              >
                Continue to checkout
              </a>
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
