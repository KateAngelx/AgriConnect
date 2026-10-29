import { notFound } from 'next/navigation'
import { MarketplaceAssistant } from '@/components/marketplace-assistant'
import { LocationMap } from '@/components/location-map'
import { ProductCard } from '@/components/product-card'
import { SiteShell } from '@/components/site-shell'
import { currentUser } from '@/server/auth'
import { isApprovedBuyer } from '@/server/roles'
import { getProduct, listRelatedProducts } from '@/server/catalog'
import { wished } from '@/server/wishlist'
import { addToCartAction } from '@/app/(frontend)/cart/actions'
import { toggleWishlistAction } from '@/app/(frontend)/wishlist/actions'
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
      <main className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2">
          <section>
            <div className="aspect-[4/3] overflow-hidden rounded-[2rem] bg-[#e7eadf]">
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
          <section className="py-3">
            <p className="page-eyebrow text-[#4f8d3b]">{category?.name ?? 'Agricultural product'}</p>
            <h1 className="page-title mt-2 text-4xl sm:text-5xl">{product.name}</h1>
            <p className="mt-4 text-3xl font-semibold">
              ₱{product.price.toLocaleString()}{' '}
              <span className="text-base font-normal text-[#65766d]">per {product.unit}</span>
            </p>
            <p className="mt-6 leading-7 text-[#65766d]">
              {product.description || 'Contact the seller for additional product details.'}
            </p>
            <div className="mt-8 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white p-4">
                <span className="text-xs text-[#65766d]">Stock</span>
                <p className="mt-1 font-semibold">
                  {product.stock} {product.unit}s available
                </p>
              </div>
              <div className="rounded-2xl bg-white p-4">
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
                className="mt-6 block rounded-2xl border border-[#173c2c]/10 bg-white p-5"
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
                />
              </div>
            ) : null}
            {user && isApprovedBuyer(user) ? (
              <>
              <form
                action={addToCartAction}
                className="mt-8 rounded-2xl bg-[#173c2c] p-6 text-white"
              >
                <input type="hidden" name="productID" value={product.id} />
                <input type="hidden" name="returnTo" value={`/products/${product.id}`} />
                <h2 className="text-lg font-semibold">Add to your cart</h2>
                <p className="mt-2 text-sm text-white/70">
                  Stock and product status are checked again on the server.
                </p>
                <div className="mt-5 flex gap-3">
                  <input
                    aria-label="Quantity"
                    name="quantity"
                    type="number"
                    min="1"
                    max={product.stock}
                    defaultValue="1"
                    className="w-24 rounded-full bg-white px-4 py-3 text-[#173c2c]"
                  />
                  <button
                    disabled={product.stock < 1}
                    className="rounded-full bg-[#bce86d] px-5 py-3 text-sm font-semibold text-[#173c2c] disabled:opacity-50"
                  >
                    {product.stock > 0 ? 'Add to cart' : 'Out of stock'}
                  </button>
                </div>
              </form>
              <form action={toggleWishlistAction} className="mt-3">
                <input type="hidden" name="productId" value={product.id} />
                <button className="text-sm font-bold text-[#3f8d29]">
                  {saved ? 'Remove from wishlist' : 'Save to wishlist'}
                </button>
              </form>
              </>
            ) : (
              <div className="mt-8 rounded-2xl bg-[#173c2c] p-6 text-white">
                <h2 className="text-lg font-semibold">Sign in to purchase</h2>
                <p className="mt-2 text-sm text-white/70">
                  Create an approved buyer account to select quantities, add items to your cart, and
                  check out securely.
                </p>
                <div className="mt-5 flex gap-3">
                  <a
                    href="/login"
                    className="rounded-full bg-[#bce86d] px-5 py-3 text-sm font-semibold text-[#173c2c]"
                  >
                    Sign in
                  </a>
                  <a
                    href="/register"
                    className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold"
                  >
                    Create account
                  </a>
                </div>
              </div>
            )}
          </section>
        </div>
        <section className="mt-16">
          <MarketplaceAssistant compact />
        </section>
        <section className="mt-20">
          <h2 className="text-3xl font-semibold">Similar products</h2>
          {related.docs.length ? (
            <div className="mt-7 grid gap-5 md:grid-cols-3">
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
