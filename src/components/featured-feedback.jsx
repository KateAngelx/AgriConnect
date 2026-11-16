import { PagedRows } from '@/components/paged-rows'

const categoryLabel = {
  'general-feedback': 'General feedback',
  suggestion: 'Suggestion',
  'bug-report': 'Bug report',
  'user-experience': 'User experience',
  'other-concern': 'Other',
}

/** Feedback an administrator chose to feature, shown publicly with first names only. */
export function FeaturedFeedback({ items }) {
  if (!items.length) return null
  return (
    <section className="page-container page-section" aria-labelledby="community-feedback-title">
      <p className="page-eyebrow">From our community</p>
      <h2 id="community-feedback-title" className="page-section-title mt-2 text-3xl text-brand-900">
        What buyers and sellers say
      </h2>
      <PagedRows asList={false} className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <figure key={item.id} className="ui-card flex h-full flex-col p-5">
            <span className="text-3xl leading-none text-[#4b9f30]" aria-hidden="true">
              “
            </span>
            <blockquote className="mt-1 line-clamp-6 flex-1 text-[15px] leading-7 text-[#142016]">
              {item.message}
            </blockquote>
            <figcaption className="mt-4 flex items-center justify-between gap-2 border-t border-[#e5ece3] pt-3 text-[13px]">
              <span>
                <strong className="text-[#142016]">{item.name}</strong>
                <span className="text-[#5c6f62]"> · {item.role}</span>
              </span>
              <span className="text-[#5c6f62]">
                {categoryLabel[item.category] || 'Feedback'}
                {item.createdAt
                  ? ` · ${new Date(item.createdAt).toLocaleDateString('en-PH', { month: 'short', year: 'numeric', timeZone: 'Asia/Manila' })}`
                  : ''}
              </span>
            </figcaption>
          </figure>
        ))}
      </PagedRows>
    </section>
  )
}
