function relationName(value) {
  return typeof value === 'object' && value ? value.farmName : 'Local seller'
}
function mediaURL(product) {
  const first = product.images?.[0]
  return typeof first === 'object' && first?.url ? first.url : null
}
export function ProductCard({ product }) {
  const image = mediaURL(product)
  return (
    <article className="overflow-hidden rounded-3xl border border-[#173c2c]/10 bg-white shadow-sm">
      <div className="aspect-[4/3] bg-[#e7eadf]">
        {image ? (
          <img
            src={image}
            alt={typeof product.images?.[0] === 'object' ? product.images[0].alt : product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full place-items-center text-sm text-[#65766d]">
            Product image coming soon
          </div>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-bold uppercase tracking-wide text-[#4f8d3b]">
            {product.stock > 0 ? `${product.stock} available` : 'Out of stock'}
          </span>
          <span className="text-xs text-[#65766d]">
            {product.pickup && product.delivery
              ? 'Pickup · Delivery'
              : product.delivery
                ? 'Delivery'
                : 'Pickup'}
          </span>
        </div>
        <h2 className="mt-3 text-xl font-semibold">{product.name}</h2>
        <p className="mt-1 text-sm text-[#65766d]">
          {relationName(product.seller)}
          {product.location ? ` · ${product.location}` : ''}
        </p>
        <div className="mt-5 flex items-end justify-between gap-3">
          <p className="text-2xl font-semibold">
            ₱{product.price.toLocaleString()}{' '}
            <span className="text-sm font-normal text-[#65766d]">/ {product.unit}</span>
          </p>
          <a
            href={`/products/${product.id}`}
            className="rounded-full bg-[#173c2c] px-4 py-2 text-sm font-semibold text-white"
          >
            View
          </a>
        </div>
      </div>
    </article>
  )
}
