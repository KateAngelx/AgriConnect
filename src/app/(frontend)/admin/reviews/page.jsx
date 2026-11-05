import Link from 'next/link'
import { moderateProductReviewAction } from '@/app/(frontend)/admin/actions'
import { DashboardShell } from '@/components/dashboard-shell'
import { AlertBanner, StatusBadge } from '@/components/dashboard-ui'
import { ConfirmButton } from '@/components/confirm-button'
import { PagedRows } from '@/components/paged-rows'
import { pretty } from '@/lib/dashboard-format'
import { requireAdmin } from '@/server/guards'
import { reviewsForAdmin } from '@/server/reviews'

const reviewStatuses = ['all', 'published', 'hidden', 'removed']

export default async function AdminReviewModerationPage({ searchParams }) {
  const user = await requireAdmin()
  const query = await searchParams
  const search = typeof query.q === 'string' ? query.q.trim().toLowerCase() : ''
  const status = reviewStatuses.includes(query.status) ? query.status : 'all'
  const allReviews = await reviewsForAdmin(user)
  const reviews = allReviews.filter((review) => {
    const matchesSearch =
      !search ||
      [review.productName, review.reviewerName, review.body, review.id].some((value) =>
        String(value || '')
          .toLowerCase()
          .includes(search),
      )
    return matchesSearch && (status === 'all' || review.moderationStatus === status)
  })

  return (
    <DashboardShell
      user={user}
      title="Review moderation"
      subtitle="Investigate product reviews and record moderation decisions. Customer ratings are never editable by administrators."
    >
      {typeof query.error === 'string' ? (
        <div className="mb-4">
          <AlertBanner tone="error">{query.error}</AlertBanner>
        </div>
      ) : null}
      {typeof query.success === 'string' ? (
        <div className="mb-4">
          <AlertBanner tone="success">{query.success}</AlertBanner>
        </div>
      ) : null}
      <form
        method="get"
        className="ui-card mb-4 grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_12rem_auto] sm:items-end"
      >
        <label className="grid gap-1 text-sm font-medium text-brand-900">
          Search reviews
          <input
            type="search"
            name="q"
            defaultValue={search}
            placeholder="Product, reviewer, comment, or review ID"
            className="min-h-11 rounded-xl border border-brand-line bg-white px-3"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-brand-900">
          Status
          <select
            name="status"
            defaultValue={status}
            className="min-h-11 rounded-xl border border-brand-line bg-white px-3"
          >
            {reviewStatuses.map((value) => (
              <option key={value} value={value}>
                {value === 'all' ? 'All statuses' : pretty(value)}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn btn-primary">
          Filter reviews
        </button>
      </form>

      <section className="ui-card overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-brand-line px-4 py-3 sm:px-5">
          <div>
            <h2 className="text-lg font-semibold text-brand-900">Product reviews</h2>
            <p className="text-sm text-brand-muted">
              {reviews.length} of {allReviews.length} reviews
            </p>
          </div>
          {search || status !== 'all' ? (
            <Link href="/admin/reviews" className="text-sm font-semibold text-brand-700">
              Clear filters
            </Link>
          ) : null}
        </div>
        {reviews.length ? (
          <PagedRows className="divide-y divide-brand-line">
            {reviews.map((review) => (
              <li key={review.id} className="px-4 py-4 sm:px-5">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                  <div className="min-w-0">
                    <Link
                      href={`/products/${encodeURIComponent(review.productId)}`}
                      className="font-semibold text-brand-900 hover:underline"
                    >
                      {review.productName}
                    </Link>
                    <p className="mt-1 text-sm text-brand-muted">
                      {review.reviewerName} · {review.rating} of 5 stars ·{' '}
                      {review.createdAt
                        ? new Date(review.createdAt).toLocaleString('en-PH')
                        : 'Date unavailable'}
                    </p>
                    <p className="mt-2 text-sm text-brand-900">
                      {review.body
                        ? `${review.body.slice(0, 240)}${review.body.length > 240 ? '…' : ''}`
                        : 'No written comment.'}
                    </p>
                    <p className="mt-1 break-all text-xs text-brand-muted">Review {review.id}</p>
                  </div>
                  <StatusBadge status={pretty(review.moderationStatus)} />
                </div>
                <details className="mt-3">
                  <summary className="w-fit cursor-pointer text-sm font-semibold text-brand-700">
                    View full review and moderation history
                  </summary>
                  <div className="mt-3 rounded-xl bg-[#f7fbf4] p-4">
                    <p className="whitespace-pre-wrap text-sm leading-6 text-brand-900">
                      {review.body || 'No written comment.'}
                    </p>
                    <p className="mt-2 text-xs text-brand-muted">
                      Customer rating: {review.rating} of 5 · Review date:{' '}
                      {review.createdAt
                        ? new Date(review.createdAt).toLocaleString('en-PH')
                        : 'Date unavailable'}
                    </p>
                    <div className="mt-4 border-t border-brand-line pt-3">
                      <h3 className="text-sm font-semibold text-brand-900">Moderation history</h3>
                      {review.moderationHistory.length ? (
                        <ol className="mt-2 space-y-3">
                          {review.moderationHistory.map((entry, index) => (
                            <li
                              key={`${entry.createdAt}-${index}`}
                              className="border-l-2 border-brand-100 pl-3"
                            >
                              <p className="text-sm font-medium text-brand-900">
                                {pretty(entry.action)} · {entry.reason}
                              </p>
                              <p className="mt-1 text-xs text-brand-muted">
                                {entry.adminName || 'Administrator'} ·{' '}
                                {entry.createdAt
                                  ? new Date(entry.createdAt).toLocaleString('en-PH')
                                  : 'Date unavailable'}
                              </p>
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <p className="mt-1 text-sm text-brand-muted">
                          No moderation action recorded.
                        </p>
                      )}
                    </div>
                  </div>
                </details>
                {review.moderationStatus !== 'removed' ? (
                  <form
                    action={moderateProductReviewAction}
                    className="mt-4 grid gap-3 border-t border-brand-line pt-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
                  >
                    <input type="hidden" name="reviewId" value={review.id} />
                    <label className="grid gap-1 text-sm font-medium text-brand-900">
                      Moderation reason (required)
                      <input
                        name="reason"
                        required
                        minLength={3}
                        maxLength={1000}
                        className="min-h-11 rounded-xl border border-brand-line bg-white px-3"
                      />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {review.moderationStatus === 'published' ? (
                        <>
                          <ModerationButton action="hide" label="Hide review" />
                          <ModerationButton action="remove" label="Remove review" danger />
                        </>
                      ) : (
                        <ModerationButton action="restore" label="Restore review" />
                      )}
                    </div>
                  </form>
                ) : (
                  <p className="mt-3 text-sm text-brand-muted">
                    Removed from public display; retained for moderation records.
                  </p>
                )}
              </li>
            ))}
          </PagedRows>
        ) : (
          <p className="p-6 text-sm text-brand-muted">No reviews match these filters.</p>
        )}
      </section>
    </DashboardShell>
  )
}

function ModerationButton({ action, label, danger = false }) {
  return (
    <ConfirmButton
      type="submit"
      name="action"
      value={action}
      danger={danger}
      message={`${label}? The customer's original rating will not be changed.`}
      className={danger ? 'btn btn-danger' : 'btn btn-secondary'}
    >
      {label}
    </ConfirmButton>
  )
}
