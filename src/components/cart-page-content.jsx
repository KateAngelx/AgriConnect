'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useCartState } from './marketplace-state'
import { peso } from '@/lib/dashboard-format'
import { DashboardIcon } from './dashboard-icons'

export function CartPageContent() {
  const { cart, cartBusy, cartLoading, cartError, refreshCart, updateCart } = useCartState()
  const [quantities, setQuantities] = useState({})
  const [selectedIds, setSelectedIds] = useState([])
  const items = cart?.items?.filter((item) => typeof item.product === 'object') ?? []
  const eligibleItems = items.filter(
    (item) =>
      item.product.status === 'active' &&
      item.product.seller?.status === 'approved' &&
      item.product.stock > 0 &&
      item.quantity <= item.product.stock,
  )
  const selectedSet = new Set(selectedIds)
  const selectedItems = eligibleItems.filter((item) => selectedSet.has(item.id))
  const subtotal = selectedItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const sellerCount = new Set(selectedItems.map((item) => item.product.seller?.id).filter(Boolean))
    .size
  const deliveryEstimate = subtotal + sellerCount * 49
  const canCheckout = selectedItems.length > 0
  const selectableIds = eligibleItems.map((item) => item.id)
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedSet.has(id))

  useEffect(() => {
    const eligibleIds = new Set(
      items
        .filter(
          (item) =>
            item.product.status === 'active' &&
            item.product.seller?.status === 'approved' &&
            item.product.stock > 0 &&
            item.quantity <= item.product.stock,
        )
        .map((item) => item.id),
    )
    setSelectedIds((previous) => {
      const stillSelected = previous.filter((id) => eligibleIds.has(id))
      return stillSelected.length ? stillSelected : [...eligibleIds]
    })
  }, [cart?.revision, items.map((item) => `${item.id}:${item.quantity}`).join('|')])

  function toggleItem(itemId) {
    setSelectedIds((previous) =>
      previous.includes(itemId) ? previous.filter((id) => id !== itemId) : [...previous, itemId],
    )
  }

  function toggleAll() {
    setSelectedIds(allSelected ? [] : selectableIds)
  }

  async function saveQuantity(item) {
    const raw = quantities[item.id]
    if (raw === undefined || raw === '') return
    const quantity = Number(raw)
    if (!Number.isInteger(quantity) || quantity < 1) return
    const result = await updateCart(item.id, quantity)
    if (result.ok) {
      setQuantities((previous) => {
        const next = { ...previous }
        delete next[item.id]
        return next
      })
    }
  }

  if (cartLoading) {
    return (
      <p role="status" className="text-sm text-[#5c6f62]">
        Loading your cart…
      </p>
    )
  }

  if (cartError) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-red-200 bg-white p-5 text-sm text-[#963b2d]"
      >
        <p>{cartError}</p>
        <button type="button" onClick={refreshCart} className="btn btn-secondary mt-3">
          Try again
        </button>
      </div>
    )
  }

  return items.length ? (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <section className="space-y-4">
        <label className="ui-card flex min-h-12 items-center gap-3 px-4 py-3 text-sm font-semibold">
          <input
            type="checkbox"
            checked={allSelected}
            disabled={selectableIds.length === 0}
            onChange={toggleAll}
            className="size-4 accent-[#2e7d32]"
          />
          Select All
          <span className="ml-auto text-xs font-normal text-[#647066]">
            {selectedItems.length} selected
          </span>
        </label>
        {items.map((item) => {
          const product = item.product
          const available = product.status === 'active' && product.seller?.status === 'approved'
          const inStock = available && product.stock > 0
          const exceedsStock = inStock && item.quantity > product.stock
          const selectable = inStock && !exceedsStock
          return (
            <article
              key={item.id}
              className="ui-card flex flex-col gap-5 p-5 sm:flex-row sm:items-center"
            >
              <input
                type="checkbox"
                checked={selectedSet.has(item.id)}
                disabled={!selectable}
                onChange={() => toggleItem(item.id)}
                aria-label={`Select ${product.name}`}
                className="size-4 shrink-0 accent-[#2e7d32]"
              />
              <div className="flex-1">
                <p
                  className={`text-xs font-bold uppercase ${inStock ? 'text-[#5dbb38]' : 'text-[#963b2d]'}`}
                >
                  {!available
                    ? 'Unavailable'
                    : product.stock > 0
                      ? `${product.stock} available`
                      : 'Out of stock'}
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
                <div className="flex items-center gap-2">
                  <input
                    aria-label={`Quantity for ${product.name}`}
                    type="number"
                    min="1"
                    max={product.stock}
                    value={quantities[item.id] ?? item.quantity}
                    disabled={cartBusy}
                    onChange={(event) =>
                      setQuantities((previous) => ({ ...previous, [item.id]: event.target.value }))
                    }
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') saveQuantity(item)
                    }}
                    className="w-20 rounded-xl border border-black/10 px-3 py-2"
                  />
                  <button
                    type="button"
                    disabled={cartBusy}
                    onClick={() => saveQuantity(item)}
                    className="btn btn-secondary"
                  >
                    {cartBusy ? 'Updating…' : 'Update'}
                  </button>
                </div>
              ) : null}
              <button
                type="button"
                disabled={cartBusy}
                onClick={() => updateCart(item.id, 0)}
                className="btn btn-danger !size-9 !min-h-9 !p-0"
                aria-label={`Remove ${product.name} from cart`}
                title="Remove from cart"
              >
                <DashboardIcon name="trash" className="size-4" />
              </button>
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
            <span className="text-[#6e6e73]">
              Delivery estimate ({sellerCount} seller{sellerCount === 1 ? '' : 's'})
            </span>
            <strong>{peso(deliveryEstimate)}</strong>
          </div>
        </div>
        <p className="mt-3 text-sm font-semibold">
          {selectedItems.length} item{selectedItems.length === 1 ? '' : 's'} selected
        </p>
        {!canCheckout ? (
          <p className="mt-3 text-xs leading-5 text-[#963b2d]">
            Select at least one available product to continue.
          </p>
        ) : null}
        <p className="mt-4 text-[12px] leading-5 text-[#6e6e73]">
          Delivery is charged per seller order. Final stock and fees are confirmed at checkout.
        </p>
        {canCheckout ? (
          <Link
            href={`/checkout?cartItemIds=${encodeURIComponent(selectedIds.join(','))}`}
            className="btn btn-primary mt-6 w-full"
          >
            Continue to checkout
          </Link>
        ) : (
          <span
            className="btn btn-primary mt-6 w-full cursor-not-allowed opacity-50"
            aria-disabled="true"
          >
            Select products to continue
          </span>
        )}
      </aside>
    </div>
  ) : (
    <div className="rounded-2xl border border-dashed border-brand-800/15 bg-white px-6 py-14 text-center">
      <h2 className="text-xl font-bold text-brand-900">Your cart is empty</h2>
      <p className="mt-2 text-brand-muted">Browse active products and add the items you want.</p>
      <Link href="/products" className="btn btn-primary mt-6">
        Browse products
      </Link>
    </div>
  )
}
