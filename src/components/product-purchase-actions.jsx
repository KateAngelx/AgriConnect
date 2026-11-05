'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMarketplaceState } from './marketplace-state'

export function ProductPurchaseActions({ product }) {
  const router = useRouter()
  const { addToCart, cartBusy } = useMarketplaceState()
  const [quantity, setQuantity] = useState('1')
  const unavailable = product.stock < 1
  const validQuantity = Number.isInteger(Number(quantity)) && Number(quantity) > 0

  async function addItem(replace = false) {
    const result = await addToCart(product, quantity, replace)
    if (result.ok && replace) router.push('/checkout')
  }

  return (
    <div className="ui-card mt-8 p-5">
      <h2 className="text-[17px] font-semibold text-[#1d1d1f]">{unavailable ? 'Currently unavailable' : 'Add to your order'}</h2>
      <p className="mt-2 text-[13px] text-[#6e6e73]">
        {unavailable
          ? 'This listing is sold out. Check back when the seller restocks.'
          : 'Stock is confirmed again before the item is added.'}
      </p>
      <div className="mt-5">
        <label htmlFor="purchase-quantity" className="text-[13px] font-semibold text-[#1d1d1f]">
          Quantity
        </label>
        <input
          id="purchase-quantity"
          type="number"
          min="1"
          max={product.stock}
          value={quantity}
          disabled={unavailable}
          onChange={(event) => setQuantity(event.target.value)}
          className="ui-field mt-2 sm:w-28 disabled:opacity-50"
        />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={unavailable || !validQuantity || cartBusy}
          onClick={() => addItem()}
          className="btn btn-secondary btn-block"
        >
          {cartBusy ? 'Adding…' : 'Add to cart'}
        </button>
        <button
          type="button"
          disabled={unavailable || !validQuantity || cartBusy}
          onClick={() => addItem(true)}
          className="btn btn-primary btn-block"
        >
          {cartBusy ? 'Processing…' : 'Buy now'}
        </button>
      </div>
    </div>
  )
}
