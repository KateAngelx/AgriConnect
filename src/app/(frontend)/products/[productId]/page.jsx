import { notFound } from 'next/navigation'
import { MarketplaceAssistant } from '@/components/marketplace-assistant'
import { LocationMap } from '@/components/location-map'
import { ProductCard } from '@/components/product-card'
import { SiteShell } from '@/components/site-shell'
import { currentUser } from '@/server/auth'
import { isApprovedBuyer } from '@/server/roles'
import { getProduct, listRelatedProducts } from '@/server/catalog'
import { wished } from '@/server/wishlist'
import { ProductPurchaseActions } from '@/components/product-purchase-actions'
import { toggleWishlistAction } from '@/app/(frontend)/wishlist/actions'
import { peso } from '@/lib/dashboard-format'
export default async function ProductDetailsPage({ params }) {
  const { productId } = await params
  const user = await currentUser()
  const product = await getProduct(productId)
  if (!product || product.status !== 'active') notFound()
  const saved = user ? await wished(user.id, product.id) : false
  const seller = typeof product.seller === 'object' ? product.seller : null
  const category = typeof product.category === 'object' ? product.category : null
  const related = await listRelatedProducts(product)
  const images = product.images?.filter((image) => typeof image === 'object' && image.url) ?? []
  return (
    <SiteShell>
      <main className="page-container page-section page-open">
        <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-sm text-brand-muted">
          <a href="/products" className="font-semibold text-brand-700">Products</a>
          {category ? (
            <>
              <span aria-hidden="true">/</span>
              <a href={`/products?category=${encodeURIComponent(category.id)}`} className="font-semibold text-brand-700">
                {category.name}
              </a>
            </>
          ) : null}
          <span aria-hidden="true">/</span>
          <span className="text-brand-900">{product.name}</span>
        </nav>
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
          <section>
            <div className="aspect-square overflow-hidden rounded-xl border border-[#d5e4d4] bg-[#f3f8ef]">
              {images[0] && typeof images[0] === 'object' ? (
                <img
                  src={images[0].url}
                  alt={images[0].alt}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full place-items-center text-[#65766d]">
                  Product image coming soon
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="mt-3 grid grid-cols-4 gap-3">
                {images
                  .slice(1)
                  .map(
                    (image) =>
                      typeof image === 'object' && (
                        <img
                          key={image.id}
                          src={image.url}
                          alt={image.alt}
                          className="aspect-square rounded-xl object-cover"
                        />
                      ),
                  )}
              </div>
            )}
          </section>
          <section>
            <p className="page-eyebrow text-[#4f8d3b]">{category?.name ?? 'Agricultural product'}</p>
            <h1 className="page-title mt-2 text-3xl text-brand-900 sm:text-4xl">{product.name}</h1>
            <p className="mt-4 text-3xl font-semibold text-brand-900">
              {peso(product.price)}{' '}
              <span className="text-base font-normal text-brand-muted">per {product.unit}</span>
            </p>
            <p className="mt-6 leading-7 text-[#65766d]">
              {product.description || 'Contact the seller for additional product details.'}
            </p>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="ui-card p-4">
                <span className="text-xs text-[#65766d]">Stock</span>
                <p className="mt-1 font-semibold">
                  {product.stock > 0 ? `${product.stock} ${product.unit} available` : 'Sold out'}
                  {product.stock > 0 && product.stock < 10 ? ' · Low stock' : ''}
                </p>
              </div>
              <div className="ui-card p-4">
                <span className="text-xs text-[#65766d]">Fulfillment</span>
                <p className="mt-1 font-semibold">
                  {[product.pickup && 'Pickup', product.delivery && 'Delivery']
                    .filter(Boolean)
                    .join(' · ') || 'Ask seller'}
                </p>
              </div>
            </div>
            {seller && (
              <a
                href={`/sellers/${seller.id}`}
                className="ui-card mt-6 block p-5"
              >
                <span className="text-xs font-bold uppercase tracking-wide text-[#4f8d3b]">
                  Approved seller
                </span>
                <h2 className="mt-2 text-xl font-semibold">{seller.farmName}</h2>
                <p className="mt-1 text-sm text-[#65766d]">{seller.location}</p>
                {seller.landmark ? (
                  <p className="mt-1 text-xs text-[#65766d]">Landmark: {seller.landmark}</p>
                ) : null}
              </a>
            )}
            {seller ? (
              <div className="mt-4">
                <LocationMap
                  lat={seller.pickupLat}
                  lng={seller.pickupLng}
                  label={`${seller.farmName} pickup`}
                  kind="pickup"
                />
              </div>
            ) : null}
            {user && isApprovedBuyer(user) ? (
              <>
              <ProductPurchaseActions product={product} />
              <form action={toggleWishlistAction} className="mt-3">
                <input type="hidden" name="productId" value={product.id} />
                <button className="btn btn-secondary">
                  {saved ? 'Remove from wishlist' : 'Save to wishlist'}
                </button>
              </form>
              </>
            ) : (
              <div className="ui-card mt-6 p-5">
                <h2 className="text-[17px] font-semibold text-[#1d1d1f]">Sign in to purchase</h2>
                <p className="mt-2 text-[13px] text-[#6e6e73]">
                  Create an approved buyer account to select quantities, add items to your cart, and
                  check out securely.
                </p>
                <div className="mt-5 flex gap-3">
                  <a href="/login" className="btn btn-primary">
                    Sign in
                  </a>
                  <a href="/register" className="btn btn-secondary">
                    Create account
                  </a>
                </div>
              </div>
            )}
          </section>
        </div>
        <section className="mt-12">
          <MarketplaceAssistant compact />
        </section>
        <section className="mt-12">
          <h2 className="page-section-title text-2xl text-brand-900">Similar products</h2>
          {related.docs.length ? (
            <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
              {related.docs.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          ) : (
            <p className="mt-4 text-[#65766d]">No comparable active listings are available yet.</p>
          )}
        </section>
      </main>
    </SiteShell>
  )
}
