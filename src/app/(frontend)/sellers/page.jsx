import { SiteShell } from '@/components/site-shell'
import { SellerCard } from '@/components/seller-card'
import { listSellers } from '@/server/catalog'

export default async function SellersPage() {
  const sellers = await listSellers({ limit: 100 })
  return (
    <SiteShell>
      <main>
        <section className="page-band">
          <div className="page-container">
            <p className="page-eyebrow">Local growers</p>
            <h1 className="page-title mt-2 text-3xl text-brand-900 sm:text-4xl">
              Meet our sellers
            </h1>
            <p className="page-lead mt-3 max-w-2xl text-brand-muted">
              Explore approved farms and see what they have available in the marketplace.
            </p>
          </div>
        </section>
        <section className="page-container page-section">
          {sellers.docs.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sellers.docs.map((seller) => (
                <SellerCard key={seller.id} seller={seller} />
              ))}
            </div>
          ) : (
            <div className="page-empty">Approved seller profiles will appear here.</div>
          )}
        </section>
      </main>
    </SiteShell>
  )
}
