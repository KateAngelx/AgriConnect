import { peso } from '@/lib/dashboard-format'
import Link from 'next/link'

function relationName(value) {
  return typeof value === 'object' && value?.farmName ? value.farmName : 'Local seller'
}

function mediaURL(product) {
  const first = product.images?.[0]
  return typeof first === 'object' && first?.url ? first.url : null
}

function stockBadge(stock) {
  if (!stock || stock <= 0) return { text: 'Sold out', className: 'bg-[#f5f5f7] text-[#6e6e73]' }
  if (stock < 10) return { text: `Low stock Â· ${stock} left`, className: 'bg-[#fff4e5] text-[#9a6700]' }
  return { text: 'In stock', className: 'bg-white text-[#248a3d]' }
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
    <article className="ui-card flex h-full flex-col overflow-hidden transition-colors hover:border-[#d2d2d7]">
      <Link href={`/products/${product.id}`} className="flex h-full flex-col text-inherit no-underline">
        <div className="product-photo">
          {image ? (
            <img src={image} alt={imageAlt} />
          ) : (
            <div className="grid h-full place-items-center px-6 text-center text-[13px] text-[#6e6e73]">No photo yet</div>
          )}
          <span className={`absolute left-2.5 top-2.5 rounded-md border border-[#e5e5ea] px-2 py-0.5 text-[11px] font-semibold ${stock.className}`}>
            {stock.text}
          </span>
        </div>
        <div className="flex flex-1 flex-col p-4">
          <p className="truncate text-[13px] text-[#6e6e73]">{relationName(product.seller)}</p>
          <h2 className="mt-0.5 line-clamp-2 min-h-[2.6em] text-[15px] font-semibold leading-snug tracking-[-0.01em] text-[#1d1d1f]">
            {product.name}
          </h2>
          <p className="mt-1 truncate text-[13px] text-[#6e6e73]">
            {product.location || 'Philippines'} Â· {fulfillmentLabel(product)}
          </p>
          {product.reviewCount > 0 ? (
            <p
              className="mt-2 text-[12px] font-medium text-[#5c6f62]"
              aria-label={`Rated ${product.rating} out of 5 from ${product.reviewCount} reviews`}
            >
              <span aria-hidden="true" className="text-[#d28b00]">?</span>{' '}
              {Number(product.rating).toFixed(1)} ({product.reviewCount}{' '}
              {product.reviewCount === 1 ? 'review' : 'reviews'})
            </p>
          ) : null}
          <p className="mt-auto pt-3 text-[17px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">
            {peso(product.price)}
            <span className="text-[13px] font-normal text-[#6e6e73]"> / {product.unit}</span>
          </p>
        </div>
      </Link>
    </article>
  )
}
