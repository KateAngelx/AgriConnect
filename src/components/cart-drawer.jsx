'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardIcon } from './dashboard-icons'
import { peso } from '@/lib/dashboard-format'
import { useMarketplaceState } from './marketplace-state'

export function CartDrawer({ open, onClose }) {
  const router = useRouter()
  const { cart, cartBusy, cartLoading, cartError, refreshCart, updateCart } = useMarketplaceState()
  const [drafts, setDrafts] = useState({})
  const [error, setError] = useState('')
  const [selectedIds, setSelectedIds] = useState([])

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

  const cartItems = cart?.items?.filter((entry) => typeof entry.product === 'object') ?? []
  const eligibleItems = cartItems.filter((entry) =>
    entry.product.status === 'active' &&
    entry.product.seller?.status === 'approved' &&
    entry.product.stock > 0 &&
    entry.quantity <= entry.product.stock,
  )

  useEffect(() => {
    const eligibleIds = new Set(eligibleItems.map((entry) => entry.id))
    setSelectedIds((previous) => {
      const stillSelected = previous.filter((id) => eligibleIds.has(id))
      if (stillSelected.length) return stillSelected
      return [...eligibleIds]
    })
  }, [cart?.revision, eligibleItems.map((entry) => `${entry.id}:${entry.quantity}`).join('|')])

  async function updateQuantity(item, quantity) {
    setError('')
    const result = await updateCart(item.id, quantity)
    if (result.error) {
      setError(result.error)
      return
    }
    setDrafts((previous) => {
      const next = { ...previous }
      delete next[item.id]
      return next
    })
  }

  if (!open) return null

  const selectedSet = new Set(selectedIds)
  const selectableIds = eligibleItems.map((entry) => entry.id)
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedSet.has(id))
  const selectedItems = eligibleItems.filter((entry) => selectedSet.has(entry.id))
  const subtotal = selectedItems.reduce(
    (sum, entry) => sum + entry.product.price * entry.quantity,
    0,
  )
  const checkoutHref = selectedIds.length
    ? `/checkout?cartItemIds=${encodeURIComponent(selectedIds.join(','))}`
    : '/checkout'

  function toggleItem(itemId) {
    setSelectedIds((previous) =>
      previous.includes(itemId)
        ? previous.filter((id) => id !== itemId)
        : [...previous, itemId],
    )
  }

  function toggleAll() {
    setSelectedIds(allSelected ? [] : selectableIds)
  }

  return (
    <div className="fixed inset-0 z-[200]" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        className="absolute right-2 top-[4.25rem] flex max-h-[calc(100dvh-5.25rem)] w-[calc(100vw-1rem)] max-w-md flex-col overflow-hidden rounded-2xl border border-[#173c2c]/10 bg-white shadow-xl sm:right-6"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-[#173c2c]/10 px-4 py-3">
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

        <div className="min-h-0 max-h-[min(28rem,55vh)] flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          {cartLoading ? (
            <p role="status" className="py-12 text-center text-sm text-[#647066]">Loading your cart…</p>
          ) : cartError ? (
            <div role="alert" className="rounded-xl bg-[#fff1ed] px-4 py-3 text-sm text-[#963b2d]">
              <p>{cartError}</p>
              <button type="button" onClick={refreshCart} className="btn btn-secondary mt-3">
                Try again
              </button>
            </div>
          ) : error ? (
            <p className="rounded-xl bg-[#fff1ed] px-4 py-3 text-sm text-[#963b2d]">{error}</p>
          ) : cartItems.length === 0 ? (
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
                className="btn btn-primary mt-6"
              >
                Continue shopping
              </button>
            </div>
          ) : (
            <>
              <label className="mb-3 flex items-center gap-2 rounded-lg border border-[#173c2c]/10 px-3 py-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={allSelected}
                  disabled={selectableIds.length === 0 || cartBusy}
                  onChange={toggleAll}
                  className="size-4 accent-[#2e7d32]"
                />
                Select All
                <span className="ml-auto text-xs font-normal text-[#647066]">
                  {selectedItems.length} selected
                </span>
              </label>
              <ul className="space-y-4">
              {cartItems.map((entry) => {
                const product = entry.product
                const image = product.images?.[0]
                const selectable =
                  product.status === 'active' &&
                  product.seller?.status === 'approved' &&
                  product.stock > 0 &&
                  entry.quantity <= product.stock
                return (
                  <li key={entry.id} className="flex gap-3 rounded-xl border border-[#173c2c]/10 p-3">
                    <input
                      type="checkbox"
                      checked={selectedSet.has(entry.id)}
                      disabled={!selectable || cartBusy}
                      onChange={() => toggleItem(entry.id)}
                      aria-label={`Select ${product.name}`}
                      className="mt-1 size-4 shrink-0 accent-[#2e7d32]"
                    />
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
                          min={1}
                          max={product.stock}
                          disabled={cartBusy}
                          value={drafts[entry.id] ?? entry.quantity}
                          onChange={(event) => {
                            setDrafts((previous) => ({ ...previous, [entry.id]: event.target.value }))
                          }}
                          onBlur={(event) => {
                            const quantity = Number(event.currentTarget.value)
                            if (Number.isInteger(quantity) && quantity > 0 && quantity !== entry.quantity) {
                              updateQuantity(entry, quantity)
                            }
                          }}
                          className="w-16 rounded-lg border border-[#173c2c]/12 px-2 py-1 text-sm"
                        />
                        <button
                          type="button"
                          disabled={cartBusy}
                          onClick={() => updateQuantity(entry, 0)}
                          className="grid size-8 place-items-center rounded-lg border border-red-200 text-[#963b2d] hover:bg-red-50"
                          aria-label={`Remove ${entry.product?.name || 'product'} from cart`}
                          title="Remove from cart"
                        >
                          <DashboardIcon name="trash" className="size-4" />
                        </button>
                      </div>
                    </div>
                    <p className="shrink-0 text-sm font-bold tabular-nums">{peso(product.price * entry.quantity)}</p>
                  </li>
                )
              })}
              </ul>
            </>
          )}
        </div>

        {cartItems.length > 0 ? (
          <footer className="shrink-0 border-t border-[#173c2c]/10 bg-white px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="flex justify-between text-sm">
              <span className="text-[#647066]">Subtotal</span>
              <span className="font-bold">{peso(subtotal)}</span>
            </div>
            <p className="mt-1 text-xs text-[#647066]">
              {selectedItems.length} item{selectedItems.length === 1 ? '' : 's'} selected
            </p>
            <p className="mt-1 text-xs text-[#647066]">Delivery fees are calculated at checkout.</p>
            <div className="mt-4 grid gap-2">
                <Link
                href={checkoutHref}
                onClick={onClose}
                aria-disabled={selectedItems.length === 0}
                className={`btn btn-primary btn-block ${selectedItems.length === 0 ? 'pointer-events-none opacity-50' : ''}`}
              >
                Proceed to checkout
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary btn-block"
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
