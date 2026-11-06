import { peso } from '@/lib/dashboard-format'
import Link from 'next/link'

function relationName(value) {
  return typeof value === 'object' && value?.farmName ? value.farmName : 'Local seller'
}

function mediaURL(product) {
  if (product.imageSrc) return product.imageSrc
  const first = product.images?.[0]
  const url = typeof first === 'object' && first?.url ? first.url : null
  if (url?.startsWith('data:image/')) {
    return `/api/products/${encodeURIComponent(product.id)}/image`
  }
  return url
}

function stockBadge(stock) {
  if (!stock || stock <= 0) return { text: 'Sold out', className: 'bg-brand-page text-brand-muted' }
  if (stock < 10) return { text: `Low stock · ${stock} left`, className: 'bg-brand-warning text-amber-800' }
  return { text: 'In stock', className: 'bg-brand-50 text-brand-700' }
}

function fulfillmentLabel(product) {
  if (product.pickup && product.delivery) return 'Pickup or delivery'
  if (product.delivery) return 'Delivery'
  if (product.pickup) return 'Pickup'
  return 'Ask the seller'
}

export function ProductCard({ product }) {
  const image = mediaURL(product)
  const stock = stockBadge(product.stock)
  const imageAlt = typeof product.images?.[0] === 'object' ? product.images[0].alt || product.name : product.name

  return (
    <article className="ui-card flex h-full flex-col overflow-hidden transition-colors hover:border-brand-500">
      <Link href={`/products/${product.id}`} className="flex h-full flex-col text-inherit no-underline">
        <div className="product-photo">
          {image ? (
            <img src={image} alt={imageAlt} loading="lazy" decoding="async" />
          ) : (
            <div className="grid h-full place-items-center px-6 text-center text-[13px] text-brand-muted">No photo yet</div>
          )}
          <span className={`absolute left-2.5 top-2.5 rounded-md border border-[#e5e5ea] px-2 py-0.5 text-[11px] font-semibold ${stock.className}`}>
            {stock.text}
          </span>
        </div>
        <div className="flex flex-1 flex-col p-4">
          <p className="truncate text-[13px] text-brand-muted">{relationName(product.seller)}</p>
          <h2 className="mt-0.5 line-clamp-2 min-h-[2.6em] text-[15px] font-semibold leading-snug tracking-[-0.01em] text-brand-900">
            {product.name}
          </h2>
          <p className="mt-1 truncate text-[13px] text-brand-muted">
            {product.location || 'Philippines'} · {fulfillmentLabel(product)}
          </p>
          {product.reviewCount > 0 ? (
            <p
              className="mt-2 flex items-center gap-1 text-[12px] font-medium text-brand-muted"
              aria-label={`Rated ${product.rating} out of 5 from ${product.reviewCount} reviews`}
            >
              <svg viewBox="0 0 20 20" className="size-3.5 fill-[#d28b00]" aria-hidden="true">
                <path d="m10 1.7 2.55 5.17 5.7.83-4.13 4.02.98 5.68L10 14.72l-5.1 2.68.98-5.68L1.75 7.7l5.7-.83L10 1.7Z" />
              </svg>
              {Number(product.rating).toFixed(1)} ({product.reviewCount}{' '}
              {product.reviewCount === 1 ? 'review' : 'reviews'})
            </p>
          ) : null}
          <p className="mt-auto pt-3 text-[17px] font-semibold tracking-[-0.02em] text-brand-900">
            {peso(product.price)}
            <span className="text-[13px] font-normal text-brand-muted"> / {product.unit}</span>
          </p>
        </div>
      </Link>
    </article>
  )
}
