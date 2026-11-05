import { SiteShell } from '@/components/site-shell'
import { SellerCard } from '@/components/seller-card'
import { listSellers } from '@/server/catalog'

export default async function SellersPage({ searchParams }) {
  const query = await searchParams
  const page = Math.max(1, Number(query.page) || 1)
  const sellers = await listSellers({ limit: 5, page })
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
            <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sellers.docs.map((seller) => (
                <SellerCard key={seller.id} seller={seller} />
              ))}
            </div>
            {sellers.totalPages > 1 ? (
              <nav className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label="Seller pagination">
                {page > 1 ? (
                  <a href={`/sellers?page=${page - 1}`} className="btn btn-secondary" rel="prev">
                    Previous
                  </a>
                ) : (
                  <span className="btn btn-secondary opacity-40">Previous</span>
                )}
                {Array.from({ length: sellers.totalPages }, (_, index) => {
                  const number = index + 1
                  const current = page === number
                  return (
                    <a
                      key={number}
                      href={`/sellers?page=${number}`}
                      aria-label={`Page ${number}`}
                      aria-current={current ? 'page' : undefined}
                      className={`grid size-9 place-items-center rounded-lg text-[13px] font-semibold ${current ? 'bg-[#1d1d1f] text-white' : 'bg-white text-[#1d1d1f] ring-1 ring-[#e5e5ea]'}`}
                    >
                      {number}
                    </a>
                  )
                })}
                {page < sellers.totalPages ? (
                  <a href={`/sellers?page=${page + 1}`} className="btn btn-secondary" rel="next">
                    Next
                  </a>
                ) : (
                  <span className="btn btn-secondary opacity-40">Next</span>
                )}
              </nav>
            ) : null}
            </>
          ) : (
            <div className="page-empty">Approved seller profiles will appear here.</div>
          )}
        </section>
      </main>
    </SiteShell>
  )
}
