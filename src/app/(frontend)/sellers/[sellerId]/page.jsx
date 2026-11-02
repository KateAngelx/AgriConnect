import { notFound } from 'next/navigation'
import { ProductCard } from '@/components/product-card'
import { SiteShell } from '@/components/site-shell'
import { getSeller, listSellerProducts } from '@/server/catalog'
export default async function SellerPage({ params }) {
  const { sellerId } = await params
  const seller = await getSeller(sellerId)
  if (!seller || seller.status !== 'approved') notFound()
  const products = await listSellerProducts(seller.id)
  const image = typeof seller.image === 'object' ? seller.image : null
  return (
    <SiteShell>
      <main>
        <section className="page-band">
          <div className="page-container flex flex-col gap-4 sm:flex-row sm:items-center">
            {image?.url ? (
              <img src={image.url} alt={image.alt} className="size-20 rounded-xl object-cover" />
            ) : (
              <div className="grid size-20 place-items-center rounded-xl bg-[#e8e8ed] text-2xl font-semibold text-[#1d1d1f]">
                {seller.farmName.charAt(0)}
              </div>
            )}
            <div>
              <span className="rounded-md bg-[#e8f5e3] px-2 py-0.5 text-[12px] font-semibold text-[#248a3d]">
                Approved seller
              </span>
              <h1 className="page-title mt-2 text-3xl text-brand-900 sm:text-4xl">{seller.farmName}</h1>
              <p className="mt-1 text-[#6e6e73]">{seller.location}</p>
            </div>
          </div>
        </section>
        <section className="page-container page-section">
          <p className="max-w-3xl text-lg leading-8 text-[#65766d]">
            {seller.description || 'This seller has not added a public farm description yet.'}
          </p>
          <h2 className="page-section-title mt-8 text-3xl text-brand-900">Available products</h2>
          {products.docs.length ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.docs.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="page-empty mt-6">
              This shop has no active products right now.
            </div>
          )}
        </section>
      </main>
    </SiteShell>
  )
}
