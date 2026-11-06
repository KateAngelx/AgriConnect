'use client'

import { useEffect, useState } from 'react'
import { proofDeliveryAction } from '@/app/(frontend)/delivery/actions'

export function ProofDeliveryForm({ deliveryId }) {
  const [preview, setPreview] = useState('')

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview)
  }, [preview])

  function selectProof(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (preview) URL.revokeObjectURL(preview)
    setPreview(URL.createObjectURL(file))
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
      {preview ? (
        <img src={preview} alt="Proof preview" className="mt-3 max-h-72 w-full rounded-lg object-contain" />
      ) : null}
      <button type="submit" className="btn btn-dark mt-3">
        Submit proof and complete delivery
      </button>
    </form>
  )
}
