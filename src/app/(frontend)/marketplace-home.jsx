import { MarketplaceAssistant } from '@/components/marketplace-assistant'

function partnerHref(user, path) {
  if ((user?.roles?.includes('buyer') || user?.role === 'buyer') && user.status === 'approved') return path
  return `/login?next=${encodeURIComponent(path)}`
}

export default function MarketplaceHome({ user = null, products, sellers, categories = [] }) {
  return (
    <main className="bg-[#f7f6ef] text-[#173c2c]">
      <section>
        <div className="relative min-h-[720px] overflow-hidden bg-[linear-gradient(90deg,rgba(6,28,13,.9)_0%,rgba(6,28,13,.46)_58%,rgba(6,28,13,.14)_100%),url('https://images.unsplash.com/photo-1777045453423-b9aaf76d6eb6?auto=format&fit=crop&w=1800&q=85')] bg-cover bg-center">
          <div className="flex min-h-[720px] max-w-3xl flex-col justify-center px-7 pb-16 pt-32 text-white sm:px-12 lg:px-16">
            <span className="page-eyebrow mb-6 w-fit rounded-full border border-white/25 bg-white/10 px-4 py-2 text-white/95 backdrop-blur">
              Supporting local Filipino farmers
            </span>
            <h1 className="page-title max-w-3xl text-5xl sm:text-6xl lg:text-7xl">
              Fresh from our farms, straight to your table.
            </h1>
            <p className="page-lead mt-5 max-w-xl text-base text-white/85 sm:text-lg">
              Discover quality produce from local farmers. Compare prices, support farming communities,
              and choose convenient pickup or delivery.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="/products"
                className="rounded-full bg-[#bce86d] px-6 py-3.5 text-sm font-bold text-[#173c2c]"
              >
                Explore products →
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="categories" className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="mb-9 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="page-eyebrow text-[#4f8d3b]">Harvest selection</p>
            <h2 className="page-section-title mt-2 text-3xl sm:text-4xl">Shop by category</h2>
          </div>
          <p className="page-lead max-w-md text-[#65766d]">Everyday essentials, grown closer to home.</p>
        </div>
        {categories.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((cat) => {
              const imageUrl =
                typeof cat.image === 'object' && cat.image?.url
                  ? cat.image.url
                  : 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=700&q=80'
              return (
                <a
                  href={`/products?category=${encodeURIComponent(cat.id)}`}
                  key={cat.id}
                  className="group relative min-h-72 overflow-hidden rounded-3xl bg-cover bg-center"
                  style={{
                    backgroundImage: `linear-gradient(0deg,rgba(6,35,24,.75),transparent 65%),url('${imageUrl}')`,
                  }}
                >
                  <span className="absolute bottom-5 left-5 text-xl font-semibold text-white">{cat.name} →</span>
                </a>
              )
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-[#173c2c]/20 bg-white p-10 text-center text-[#65766d]">
            Fresh listings are being prepared. Check back soon.
          </div>
        )}
      </section>

      <section id="products" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="page-eyebrow text-[#4f8d3b]">Marketplace</p>
          <h2 className="page-section-title mt-2 text-3xl sm:text-4xl">Fresh picks from local farms</h2>
          <p className="page-lead mt-3 text-[#65766d]">Live listings from approved AgriConnect sellers.</p>
          {products.length ? (
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <article
                  key={product.id}
                  className="rounded-3xl border border-[#173c2c]/10 bg-[#faf9f4] p-6"
                >
                  <span className="rounded-full bg-[#dff0cd] px-3 py-1 text-xs font-bold">
                    {product.stock > 0 ? 'Available' : 'Out of stock'}
                  </span>
                  <h3 className="mt-4 text-xl font-semibold leading-snug">{product.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#65766d]">
                    {typeof product.seller === 'object' ? product.seller.farmName : 'Local seller'} ·{' '}
                    {product.location || 'Philippines'}
                  </p>
                  <p className="mt-4 text-2xl font-semibold">
                    ₱{Number(product.price).toLocaleString()}{' '}
                    <span className="text-sm font-normal text-[#65766d]">/ {product.unit}</span>
                  </p>
                  <a
                    href={`/products/${product.id}`}
                    className="mt-5 inline-block text-sm font-semibold text-[#1d6b45]"
                  >
                    View product →
                  </a>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-10 rounded-3xl border border-dashed border-[#173c2c]/20 bg-[#faf9f4] p-10 text-center text-[#65766d]">
              Fresh listings are being prepared. Check back soon.
            </div>
          )}
        </div>
      </section>

      <section id="partner-programs" className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="rounded-[2rem] border border-[#173c2c]/10 bg-white p-8 shadow-sm sm:p-10">
          <p className="page-eyebrow text-[#4f8d3b]">Partner programs</p>
          <h2 className="page-section-title mt-2 text-3xl text-[#173c2c]">Grow with AgriConnect</h2>
          <p className="page-lead mt-4 max-w-2xl text-[#65766d]">
            Apply to sell produce or deliver orders. An administrator must approve each request.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={partnerHref(user, '/account/become-seller')}
              className="rounded-full bg-[#5dbb38] px-6 py-3.5 text-sm font-bold text-white hover:opacity-95"
            >
              Apply to sell →
            </a>
            <a
              href={partnerHref(user, '/account/become-delivery')}
              className="rounded-full bg-[#142a19] px-6 py-3.5 text-sm font-bold text-white hover:opacity-95"
            >
              Apply to deliver →
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <MarketplaceAssistant compact />
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-20 lg:px-8">
        <div className="grid overflow-hidden rounded-[2rem] bg-[#123c2d] text-white lg:grid-cols-[1.2fr_.8fr]">
          <div className="p-8 sm:p-12">
            <p className="page-eyebrow text-[#bce86d]">Marketplace impact</p>
            <h2 className="page-section-title mt-3 max-w-xl text-4xl sm:text-5xl">
              A clearer path from harvest to household.
            </h2>
            <p className="page-lead mt-5 max-w-xl text-white/75">
              AgriConnect gives farmers a digital storefront and helps buyers make informed choices. Live
              totals appear here only when marketplace records exist.
            </p>
          </div>
          <div className="grid grid-cols-2 border-t border-white/10 lg:border-l lg:border-t-0">
            {[
              ['Approved sellers', sellers.length],
              ['Active products', products.length],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex flex-col justify-end border-r border-white/10 p-7 last:border-r-0"
              >
                <span className="text-4xl font-semibold text-[#bce86d]">{value}</span>
                <span className="mt-2 text-sm leading-relaxed text-white/65">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
