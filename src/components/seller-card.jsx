function sellerInitial(name) {
  return String(name || 'Farm')
    .trim()
    .charAt(0)
    .toUpperCase()
}

export function SellerCard({ seller }) {
  const image = typeof seller.image === 'object' ? seller.image : null
  return (
    <article className="ui-card flex h-full flex-col overflow-hidden">
      <a href={`/sellers/${seller.id}`} className="flex h-full flex-col text-inherit no-underline">
        <div className="flex items-center gap-4 p-5">
          {image?.url ? (
            <img
              src={image.url}
              alt={image.alt || seller.farmName}
              className="size-16 shrink-0 rounded-xl object-cover"
            />
          ) : (
            <span className="grid size-16 shrink-0 place-items-center rounded-xl bg-[#e8f5e3] text-2xl font-semibold text-[#2e7d32]">
              {sellerInitial(seller.farmName)}
            </span>
          )}
          <div className="min-w-0">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#248a3d]">
              Approved seller
            </span>
            <h2 className="mt-1 truncate text-lg font-semibold text-brand-900">
              {seller.farmName}
            </h2>
            <p className="mt-1 text-sm text-brand-muted">{seller.location || 'Philippines'}</p>
          </div>
        </div>
        <p className="mt-auto px-5 pb-5 text-sm leading-6 text-brand-muted">
          {seller.description || 'View this farm profile and its available products.'}
        </p>
      </a>
    </article>
  )
}
