'use client'

import { useActionState } from 'react'
import { saveProductAction } from '@/app/(frontend)/seller/actions'

const field =
  'mt-2 w-full rounded-2xl border border-black/10 bg-[#f8f8f3] px-4 py-3 outline-none focus:border-[#5dbb38]'

export function ProductForm({ categories, product }) {
  const [state, action, pending] = useActionState(saveProductAction, { error: '' })
  const image = product?.images?.find((item) => item?.url)?.url || ''
  return (
    <form action={action} className="space-y-4 rounded-3xl bg-white p-6">
      {product && <input type="hidden" name="productId" value={product.id} />}
      <div>
        <label className="text-sm font-bold" htmlFor="name">
          Product name
        </label>
        <input id="name" name="name" required defaultValue={product?.name || ''} className={field} />
      </div>
      <div>
        <label className="text-sm font-bold" htmlFor="description">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={product?.description || ''}
          className={field}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-bold" htmlFor="price">
            Price (PHP)
          </label>
          <input
            id="price"
            name="price"
            type="number"
            min="1"
            step="0.01"
            required
            defaultValue={product?.price ?? ''}
            className={field}
          />
        </div>
        <div>
          <label className="text-sm font-bold" htmlFor="unit">
            Unit
          </label>
          <select id="unit" name="unit" defaultValue={product?.unit || 'kilogram'} className={field}>
            {['kilogram', 'bundle', 'tray', 'sack', 'piece'].map((unit) => (
              <option key={unit}>{unit}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-bold" htmlFor="stock">
            Stock
          </label>
          <input
            id="stock"
            name="stock"
            type="number"
            min="0"
            step="1"
            required
            defaultValue={product?.stock ?? 0}
            className={field}
          />
        </div>
        <div>
          <label className="text-sm font-bold" htmlFor="category">
            Category
          </label>
          <select
            id="category"
            name="category"
            defaultValue={product?.category?.id || categories[0]?.id || ''}
            className={field}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="text-sm font-bold" htmlFor="location">
          Location
        </label>
        <input id="location" name="location" required defaultValue={product?.location || ''} className={field} />
      </div>
      <div>
        <label className="text-sm font-bold" htmlFor="imageUrl">
          Image URL
        </label>
        <input
          id="imageUrl"
          name="imageUrl"
          type="url"
          placeholder="https://"
          defaultValue={image}
          className={field}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="flex items-center gap-2 text-sm font-bold">
          <input type="checkbox" name="pickup" value="yes" defaultChecked={product ? product.pickup : true} />
          Pickup
        </label>
        <label className="flex items-center gap-2 text-sm font-bold">
          <input type="checkbox" name="delivery" value="yes" defaultChecked={product ? product.delivery : true} />
          Delivery
        </label>
        <div>
          <label className="text-sm font-bold" htmlFor="status">
            Listing
          </label>
          <select id="status" name="status" defaultValue={product?.status || 'active'} className={field}>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>
      {state.error && (
        <p role="alert" className="rounded-xl bg-[#fff1ed] px-4 py-3 text-sm text-[#963b2d]">
          {state.error}
        </p>
      )}
      <button disabled={pending} className="rounded-full bg-[#5dbb38] px-6 py-3 font-bold text-white">
        {pending ? 'Saving…' : 'Save product'}
      </button>
    </form>
  )
}
