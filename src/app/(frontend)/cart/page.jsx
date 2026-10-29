import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard-shell'
import { currentUser } from '@/server/auth'
import { getCart } from '@/server/cart'
import { updateCartAction } from '@/app/(frontend)/cart/actions'
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
    <DashboardShell user={user} title="Your cart" subtitle="Review quantities before checkout.">
        {items.length ? (
          <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
            <section className="space-y-4">
              {items.map((item, index) => {
                const product = typeof item.product === 'object' ? item.product : null
                if (!product) return null
                return (
                  <article
                    key={item.id ?? `${product.id}-${index}`}
                    className="flex flex-col gap-5 rounded-[2rem] border border-[#173c2c]/10 bg-white p-6 shadow-sm sm:flex-row sm:items-center"
                  >
                    <div className="flex-1">
                      <p className="text-xs font-bold uppercase text-[#5dbb38]">
                        {product.stock > 0 ? `${product.stock} available` : 'Out of stock'}
                      </p>
                      <h2 className="mt-2 text-xl font-bold">{product.name}</h2>
                      <p className="mt-1 text-sm text-[#647066]">
                        ₱{product.price.toLocaleString()} / {product.unit}
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
                      <button className="rounded-full border border-black/10 px-4 py-2 text-sm font-bold">
                        Update
                      </button>
                    </form>
                    <p className="w-28 text-right font-bold">
                      ₱{(product.price * item.quantity).toLocaleString()}
                    </p>
                  </article>
                )
              })}
            </section>
            <aside className="h-fit rounded-[2rem] bg-[#142a19] p-7 text-white">
              <h2 className="text-xl font-bold">Order summary</h2>
              <div className="mt-6 flex justify-between border-b border-white/10 pb-5 text-sm">
                <span className="text-white/60">Subtotal</span>
                <strong>₱{subtotal.toLocaleString()}</strong>
              </div>
              <p className="mt-5 text-xs leading-5 text-white/55">
                Delivery fees and final stock are validated during checkout.
              </p>
              <a
                href="/checkout"
                className="mt-6 block rounded-full bg-[#5dbb38] px-5 py-4 text-center font-bold"
              >
                Proceed to checkout →
              </a>
            </aside>
          </div>
        ) : (
          <div className="rounded-[2rem] border border-dashed border-[#173c2c]/15 bg-white p-12 text-center">
            <h2 className="text-2xl font-bold">Your cart is empty.</h2>
            <p className="mt-2 text-[#647066]">Browse active products and add available items.</p>
            <a
              href="/products"
              className="mt-6 inline-block rounded-full bg-[#5dbb38] px-6 py-3 font-bold text-white"
            >
              Explore products
            </a>
          </div>
        )}
    </DashboardShell>
  )
}
