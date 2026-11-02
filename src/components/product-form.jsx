'use client'

import { useActionState, useState } from 'react'
import { saveProductAction } from '@/app/(frontend)/seller/actions'

async function loadPhoto(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file)
    } catch {
      // Some phone photo formats need the image element path.
    }
  }
  const objectUrl = URL.createObjectURL(file)
  try {
    const image = await new Promise((resolve, reject) => {
      const element = new Image()
      element.onload = () => resolve(element)
      element.onerror = () => reject(new Error('Could not read that photo. Try a JPG.'))
      element.src = objectUrl
    })
    return image
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

async function photoDataUrl(file) {
  if (!file || (file.type && !file.type.startsWith('image/'))) {
    throw new Error('Choose a photo.')
  }
  const bitmap = await loadPhoto(file)
  const max = 1280
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close?.()
  let quality = 0.82
  let data = canvas.toDataURL('image/jpeg', quality)
  while (data.length > 700_000 && quality > 0.45) {
    quality -= 0.1
    data = canvas.toDataURL('image/jpeg', quality)
  }
  if (data.length > 1_000_000) {
    throw new Error('That photo is too large. Try another one.')
  }
  return data
}

function ProductPhotoField({ initial }) {
  const [preview, setPreview] = useState(initial || '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onPick(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setBusy(true)
    setError('')
    try {
      setPreview(await photoDataUrl(file))
    } catch (pickError) {
      setError(pickError.message || 'Could not use that photo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <p className="text-sm font-bold">Product photo</p>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#eef0ea]">
          {preview ? <img src={preview} alt="" className="size-full object-cover" /> : <span className="px-2 text-center text-[12px] text-[#5c6f62]">No photo</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="btn btn-secondary">
            {busy ? 'Preparing…' : 'Upload photo'}
            <input type="file" accept="image/*" className="sr-only" onChange={onPick} disabled={busy} />
          </label>
          <label className="btn btn-secondary">
            Take photo
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={onPick} disabled={busy} />
          </label>
          {preview ? (
            <button type="button" className="btn btn-danger" onClick={() => { setPreview(''); setError('') }}>
              Remove
            </button>
          ) : null}
        </div>
      </div>
      <p className="mt-2 text-[12px] text-[#5c6f62]">On a phone, Take photo opens the camera. Upload photo opens your library.</p>
      <input type="hidden" name="imageUrl" value={preview} />
      {error ? <p role="alert" className="mt-2 text-sm text-[#963b2d]">{error}</p> : null}
    </div>
  )
}

const field =
  'mt-2 w-full rounded-2xl border border-black/10 bg-[#f8f8f3] px-4 py-3 outline-none focus:border-[#5dbb38]'

export function ProductForm({ categories, product }) {
  const [state, action, pending] = useActionState(saveProductAction, { error: '' })
  const image = product?.images?.find((item) => item?.url)?.url || ''
  return (
    <form action={action} className="space-y-4">
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
      <ProductPhotoField initial={image} />
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
      <button disabled={pending} className="btn btn-primary">
        {pending ? 'Saving…' : 'Save product'}
      </button>
    </form>
  )
}
