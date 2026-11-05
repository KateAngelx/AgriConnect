import { DashboardShell } from '@/components/dashboard-shell'
import { StatusBadge } from '@/components/dashboard-ui'
import { requireApprovedSeller } from '@/server/guards'
import { sellerRatingSummary } from '@/server/reviews'

export default async function SellerReviewsPage() {
  const user = await requireApprovedSeller()
  const summary = await sellerRatingSummary(user)
  const productGroups = new Map()
  for (const review of summary.reviews) {
    const group = productGroups.get(review.productId) || {
      productId: review.productId,
      productName: review.productName,
      reviews: [],
    }
    group.reviews.push(review)
    productGroups.set(review.productId, group)
  }

  return (
    <DashboardShell user={user} title="Product reviews" subtitle="Customer ratings and comments for your products. Reviews are read-only for sellers.">
      <section className="ui-card mb-5 flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <p className="text-sm font-semibold text-brand-muted">Your overall product rating</p>
          <p className="mt-1 text-3xl font-bold text-brand-900">
            {summary.averageRating === null ? '—' : `${summary.averageRating.toFixed(1)} / 5`}
          </p>
        </div>
        <div className="text-sm text-brand-muted">
          {summary.reviewCount} customer review{summary.reviewCount === 1 ? '' : 's'}
        </div>
      </section>
      {productGroups.size ? (
        <div className="grid gap-5">
          {[...productGroups.values()].map((group) => {
            const average = group.reviews.reduce((sum, review) => sum + review.rating, 0) / group.reviews.length
            return (
              <section key={group.productId} className="ui-card overflow-hidden">
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-line px-5 py-4">
                  <h2 className="text-lg font-semibold text-brand-900">{group.productName}</h2>
                  <p className="text-sm font-semibold text-brand-muted">
                    {average.toFixed(1)} / 5 · {group.reviews.length} review{group.reviews.length === 1 ? '' : 's'}
                  </p>
                </header>
                <ul className="divide-y divide-brand-line">
                  {group.reviews.map((review) => (
                    <li key={review.id} className="px-5 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-brand-900">{review.reviewerName}</span>
                          <span className="text-sm font-medium text-amber-700" aria-label={`${review.rating} out of 5 stars`}>
                            {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status="Customer review" />
                          {review.createdAt ? (
                            <time dateTime={review.createdAt} className="text-xs text-brand-muted">
                              {new Date(review.createdAt).toLocaleDateString('en-PH')}
                            </time>
                          ) : null}
                        </div>
                      </div>
                      {review.body ? (
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-brand-muted">{review.body}</p>
                      ) : (
                        <p className="mt-3 text-sm italic text-brand-muted">No written comment.</p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      ) : (
        <div className="page-empty">Customer reviews for your products will appear here.</div>
      )}
    </DashboardShell>
  )
}
