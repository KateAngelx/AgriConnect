import { AlertBanner, StatusBadge } from '@/components/dashboard-ui'
import { DashboardShell } from '@/components/dashboard-shell'
import { FEEDBACK_CATEGORIES, feedbackForBuyer } from '@/server/feedback'
import { requireApprovedBuyer } from '@/server/guards'
import { submitFeedbackAction } from '@/app/(frontend)/feedback/actions'

const categoryLabels = Object.fromEntries(FEEDBACK_CATEGORIES)

export default async function FeedbackPage({ searchParams }) {
  const user = await requireApprovedBuyer('/feedback')
  const query = await searchParams
  const submissions = await feedbackForBuyer(user)

  return (
    <DashboardShell user={user} title="Feedback" subtitle="Share a concern or suggestion and follow its status and administrator response.">
      {typeof query.error === 'string' ? (
        <div className="mb-4"><AlertBanner tone="error">{query.error}</AlertBanner></div>
      ) : null}
      {typeof query.success === 'string' ? (
        <div className="mb-4"><AlertBanner tone="success">{query.success}</AlertBanner></div>
      ) : null}

      <section className="ui-card p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-brand-900">Submit feedback</h2>
        <form action={submitFeedbackAction} className="mt-4 grid gap-4">
          <label className="grid gap-1 text-sm font-medium text-brand-900">
            Subject
            <input
              name="subject"
              required
              minLength={3}
              maxLength={120}
              className="min-h-11 rounded-xl border border-brand-line bg-white px-3"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium text-brand-900">
            Category
            <select name="category" required className="min-h-11 rounded-xl border border-brand-line bg-white px-3">
              <option value="">Choose a category</option>
              {FEEDBACK_CATEGORIES.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium text-brand-900">
            Message
            <textarea
              name="message"
              required
              minLength={10}
              maxLength={5000}
              rows={5}
              className="rounded-xl border border-brand-line bg-white px-3 py-2"
            />
          </label>
          <button type="submit" className="btn btn-primary w-fit">Submit feedback</button>
        </form>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-lg font-semibold text-brand-900">Your submissions</h2>
        {submissions.length ? (
          <div className="grid gap-4">
            {submissions.map((entry) => (
              <article key={entry.id} className="ui-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                      {categoryLabels[entry.category] || 'Feedback'}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-brand-900">{entry.subject}</h3>
                    <time dateTime={entry.createdAt} className="mt-1 block text-xs text-brand-muted">
                      Submitted {new Date(entry.createdAt).toLocaleString('en-PH')}
                    </time>
                  </div>
                  <StatusBadge status={entry.status} />
                </div>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-brand-muted">{entry.message}</p>
                {entry.adminResponse ? (
                  <div className="mt-4 rounded-xl border border-brand-line bg-[#f7fbf4] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Administrator response</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-brand-900">{entry.adminResponse}</p>
                    {entry.respondedAt ? (
                      <time dateTime={entry.respondedAt} className="mt-2 block text-xs text-brand-muted">
                        Responded {new Date(entry.respondedAt).toLocaleString('en-PH')}
                      </time>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-brand-muted">No administrator response yet.</p>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div className="page-empty">You have not submitted any feedback yet.</div>
        )}
      </section>
    </DashboardShell>
  )
}
