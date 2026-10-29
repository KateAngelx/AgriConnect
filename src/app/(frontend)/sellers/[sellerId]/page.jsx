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
        <section className="bg-[#173c2c] text-white">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-16 sm:flex-row sm:items-center lg:px-8">
            {image?.url ? (
              <img src={image.url} alt={image.alt} className="size-28 rounded-3xl object-cover" />
            ) : (
              <div className="grid size-28 rounded-3xl bg-white/10 place-items-center text-3xl">
                {seller.farmName.charAt(0)}
              </div>
            )}
            <div>
              <span className="rounded-full bg-[#bce86d] px-3 py-1 text-xs font-bold text-[#173c2c]">
                Approved seller
              </span>
              <h1 className="mt-4 text-4xl font-semibold">{seller.farmName}</h1>
              <p className="mt-2 text-white/65">{seller.location}</p>
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
          <p className="max-w-3xl text-lg leading-8 text-[#65766d]">
            {seller.description || 'This seller has not added a public farm description yet.'}
          </p>
          <h2 className="mt-12 text-3xl font-semibold">Available products</h2>
          {products.docs.length ? (
            <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {products.docs.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="mt-7 rounded-3xl border border-dashed border-[#173c2c]/20 p-10 text-[#65766d]">
              This shop has no active products right now.
            </div>
          )}
        </section>
      </main>
    </SiteShell>
  )
}
