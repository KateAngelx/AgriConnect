'use client'

import { useState } from 'react'
import { addToCartAction, buyNowAction } from '@/app/(frontend)/cart/actions'

export function ProductPurchaseActions({ product }) {
  const [quantity, setQuantity] = useState('1')
  const unavailable = product.stock < 1

  return (
    <div className="mt-8 rounded-2xl bg-[#173c2c] p-6 text-white">
      <h2 className="text-lg font-semibold">Choose quantity</h2>
      <p className="mt-2 text-sm text-white/70">
        Stock and product status are checked again on the server.
      </p>
      <div className="mt-5">
        <input
          aria-label="Quantity"
          type="number"
          min="1"
          max={product.stock}
          value={quantity}
          disabled={unavailable}
          onChange={(event) => setQuantity(event.target.value)}
          className="w-full rounded-xl bg-white px-4 py-3 text-[#173c2c] sm:w-24 disabled:opacity-50"
        />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <form action={addToCartAction}>
          <input type="hidden" name="productID" value={product.id} />
          <input type="hidden" name="returnTo" value={`/products/${product.id}`} />
          <input type="hidden" name="quantity" value={quantity} />
          <button
            type="submit"
            disabled={unavailable}
            className="w-full rounded-full border border-white/30 px-5 py-3 text-sm font-semibold disabled:opacity-50"
          >
            Add to cart
          </button>
        </form>
        <form action={buyNowAction}>
          <input type="hidden" name="productID" value={product.id} />
          <input type="hidden" name="quantity" value={quantity} />
          <button
            type="submit"
            disabled={unavailable}
            className="w-full rounded-full bg-[#bce86d] px-5 py-3 text-sm font-semibold text-[#173c2c] disabled:opacity-50"
          >
            Buy now
          </button>
        </form>
      </div>
    </div>
  )
}
