'use client'

import { useState } from 'react'
import { addToCartAction, buyNowAction } from '@/app/(frontend)/cart/actions'

export function ProductPurchaseActions({ product }) {
  const [quantity, setQuantity] = useState('1')
  const unavailable = product.stock < 1

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
        <form action={addToCartAction}>
          <input type="hidden" name="productID" value={product.id} />
          <input type="hidden" name="returnTo" value={`/products/${product.id}`} />
          <input type="hidden" name="quantity" value={quantity} />
          <button
            type="submit"
            disabled={unavailable}
            className="btn btn-secondary btn-block"
          >
            Add to cart
          </button>
        </form>
        <form action={buyNowAction}>
          <input type="hidden" name="productID" value={product.id} />
          <input type="hidden" name="returnTo" value={`/products/${product.id}`} />
          <input type="hidden" name="quantity" value={quantity} />
          <button
            type="submit"
            disabled={unavailable}
            className="btn btn-primary btn-block"
          >
            Buy now
          </button>
        </form>
      </div>
    </div>
  )
}
