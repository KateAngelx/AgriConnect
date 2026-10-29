'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardIcon } from './dashboard-icons'
import { peso } from '@/lib/dashboard-format'

export function CartDrawer({ open, onClose }) {
  const router = useRouter()
  const [cart, setCart] = useState(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/cart', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not load cart.')
      setCart(data.cart)
    } catch (err) {
      setError(err.message || 'Could not load cart.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    load()
  }, [open, load])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  async function updateQuantity(item, quantity) {
    if (!cart) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/cart', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartID: cart.id, itemID: item.id, quantity }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Update failed.')
      setCart(data.cart)
      router.refresh()
    } catch (err) {
      setError(err.message || 'Update failed.')
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  const items = cart?.items?.filter((entry) => typeof entry.product === 'object') ?? []
  const subtotal = items.reduce(
    (sum, entry) => sum + entry.product.price * entry.quantity,
    0,
  )

  return (
    <div className="fixed inset-0 z-[200] flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-[#142016]/40"
        aria-label="Close cart"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        className="relative flex h-full max-h-[100dvh] w-full max-w-md flex-col overflow-hidden bg-white shadow-2xl"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-[#173c2c]/10 px-5 py-4">
          <h2 id="cart-drawer-title" className="text-lg font-bold text-[#142016]">
            Shopping cart
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-full border border-[#173c2c]/10 text-xl leading-none text-[#647066] hover:bg-[#f4f6f8]"
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          {loading ? (
            <p className="text-sm text-[#647066]">Loading cart…</p>
          ) : error ? (
            <p className="rounded-xl bg-[#fff1ed] px-4 py-3 text-sm text-[#963b2d]">{error}</p>
          ) : items.length === 0 ? (
            <div className="py-12 text-center">
              <DashboardIcon name="cart" className="mx-auto size-10 text-[#647066]" />
              <p className="mt-4 text-sm font-semibold text-[#142016]">Your cart is empty</p>
              <p className="mt-1 text-sm text-[#647066]">Browse products and add items to check out.</p>
              <button
                type="button"
                onClick={() => {
                  onClose()
                  router.push('/products')
                }}
                className="mt-6 rounded-full bg-[#5dbb38] px-5 py-2.5 text-sm font-bold text-white"
              >
                Continue shopping
              </button>
            </div>
          ) : (
            <ul className="space-y-4">
              {items.map((entry) => {
                const product = entry.product
                const image = product.images?.[0]
                return (
                  <li key={entry.id} className="flex gap-3 rounded-xl border border-[#173c2c]/10 p-3">
                    <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-[#eef0ea]">
                      {image?.url ? (
                        <img src={image.url} alt="" className="size-full object-cover" />
                      ) : (
                        <div className="grid size-full place-items-center text-[10px] text-[#647066]">No image</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <p className="line-clamp-2 text-sm font-bold leading-snug text-[#142016]">{product.name}</p>
                      <p className="text-xs text-[#647066]">
                        {typeof product.seller === 'object' ? product.seller.farmName : 'Seller'}
                      </p>
                      <p className="mt-1 text-sm font-semibold">
                        {peso(product.price)} <span className="font-normal text-[#647066]">/ {product.unit}</span>
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <label className="sr-only" htmlFor={`qty-${entry.id}`}>
                          Quantity
                        </label>
                        <input
                          id={`qty-${entry.id}`}
                          type="number"
                          min={0}
                          max={product.stock}
                          disabled={busy}
                          value={entry.quantity}
                          onChange={(event) => updateQuantity(entry, Number(event.target.value))}
                          className="w-16 rounded-lg border border-[#173c2c]/12 px-2 py-1 text-sm"
                        />
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => updateQuantity(entry, 0)}
                          className="text-xs font-bold text-[#963b2d]"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    <p className="shrink-0 text-sm font-bold tabular-nums">{peso(product.price * entry.quantity)}</p>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {items.length > 0 ? (
          <footer className="shrink-0 border-t border-[#173c2c]/10 bg-white px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="flex justify-between text-sm">
              <span className="text-[#647066]">Subtotal</span>
              <span className="font-bold">{peso(subtotal)}</span>
            </div>
            <p className="mt-1 text-xs text-[#647066]">Delivery fees are calculated at checkout.</p>
            <div className="mt-4 grid gap-2">
              <a
                href="/checkout"
                onClick={onClose}
                className="block rounded-full bg-[#5dbb38] py-3 text-center text-sm font-bold text-white"
              >
                Proceed to checkout
              </a>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-[#173c2c]/15 py-2.5 text-sm font-bold text-[#142016]"
              >
                Continue shopping
              </button>
            </div>
          </footer>
        ) : null}
      </aside>
    </div>
  )
}
