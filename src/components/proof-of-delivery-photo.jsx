import { formatDateTime } from '@/lib/date-time'

// The courier's proof-of-delivery photo, shown to the seller and admin on a delivered order.
export function ProofOfDeliveryPhoto({ proof, courierName = '' }) {
  if (!proof?.url) return null
  const uploaded = proof.uploadedAt ? formatDateTime(proof.uploadedAt) : ''
  return (
    <section className="mt-4 rounded-xl border border-brand-line bg-white p-4">
      <h3 className="text-sm font-bold text-[#142016]">Proof of delivery</h3>
      {uploaded || courierName ? (
        <p className="mt-1 text-[13px] text-[#5c6f62]">
          {[courierName ? `Uploaded by ${courierName}` : 'Uploaded', uploaded].filter(Boolean).join(' · ')}
        </p>
      ) : null}
      <a href={proof.url} target="_blank" rel="noreferrer" className="mt-3 block">
        <img
          src={proof.url}
          alt="Proof of delivery"
          className="max-h-80 w-full rounded-lg bg-[#f4f6f2] object-contain"
        />
      </a>
    </section>
  )
}
