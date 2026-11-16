'use client'

import { useEffect, useState } from 'react'
import { proofDeliveryAction } from '@/app/(frontend)/delivery/actions'
import { SubmitButton } from '@/components/submit-button'

// Phone camera photos are often 3–8 MB, above the server action body limit in
// next.config.js. Shrink the photo in the browser before it is submitted.
const MAX_SIDE = 1600
const QUALITY = 0.8

async function shrinkImage(file) {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close?.()
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY))
    if (!blob || blob.size >= file.size) return file
    const name = file.name.replace(/\.[^.]+$/, '') || 'proof'
    return new File([blob], `${name}.jpg`, { type: 'image/jpeg' })
  } catch {
    return file
  }
}

export function ProofDeliveryForm({ deliveryId }) {
  const [preview, setPreview] = useState('')
  const [preparing, setPreparing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview)
  }, [preview])

  async function selectProof(event) {
    const input = event.target
    const file = input.files?.[0]
    setError('')
    if (!file) return
    setPreparing(true)
    const smaller = await shrinkImage(file)
    if (smaller !== file) {
      const transfer = new DataTransfer()
      transfer.items.add(smaller)
      input.files = transfer.files
    }
    setPreparing(false)
    if (smaller.size > 1.9 * 1024 * 1024) {
      setError('This photo is too large to upload. Please take a new photo and try again.')
      input.value = ''
      return
    }
    if (preview) URL.revokeObjectURL(preview)
    setPreview(URL.createObjectURL(smaller))
  }

  return (
    <form action={proofDeliveryAction} className="mt-4 rounded-xl border border-brand-line bg-white p-4">
      <input type="hidden" name="deliveryId" value={deliveryId} />
      <label className="grid gap-2 text-sm font-semibold text-brand-900">
        Proof of delivery photo
        <input
          type="file"
          name="proof"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          required
          onChange={selectProof}
          className="ui-field"
        />
      </label>
      {preparing ? <p className="mt-2 text-sm text-[#5c6f62]">Preparing photo…</p> : null}
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
      {preview ? (
        <img src={preview} alt="Proof preview" className="mt-3 max-h-72 w-full rounded-lg object-contain" />
      ) : null}
      <SubmitButton className="btn btn-dark mt-3" pendingLabel="Uploading proof…" disabled={preparing}>
        Submit proof and complete delivery
      </SubmitButton>
    </form>
  )
}
