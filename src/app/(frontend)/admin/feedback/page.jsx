import { respondToFeedbackAction } from '@/app/(frontend)/admin/feedback/actions'
import { DashboardShell } from '@/components/dashboard-shell'
import { AlertBanner, StatusBadge } from '@/components/dashboard-ui'
import { AdminAiAssist } from '@/components/admin-ai-assist'
import { FEEDBACK_CATEGORIES, feedbackForAdmin } from '@/server/feedback'
import { requireAdmin } from '@/server/guards'

const categoryLabels = Object.fromEntries(FEEDBACK_CATEGORIES)

export default async function AdminFeedbackPage({ searchParams }) {
  const user = await requireAdmin()
  const query = await searchParams
  const search = typeof query.q === 'string' ? query.q.trim().toLowerCase() : ''
  const validStatuses = ['pending', 'under-review', 'responded', 'resolved']
  const selectedStatus = validStatuses.includes(query.status) ? query.status : 'all'
  const allEntries = await feedbackForAdmin(user)
  const entries = allEntries.filter((entry) => {
    const matchesSearch =
      !search ||
      [entry.id, entry.buyerName, entry.subject, entry.category].some((value) =>
        String(value || '')
          .toLowerCase()
          .includes(search),
      )
    return matchesSearch && (selectedStatus === 'all' || entry.status === selectedStatus)
  })

  return (
    <DashboardShell
      user={user}
      title="Feedback management"
      subtitle="Review private buyer and seller submissions, keep response history, and update their status."
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
        className="ui-card mb-4 grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_14rem_auto] sm:items-end"
      >
        <label className="grid gap-1 text-sm font-medium text-brand-900">
          Search feedback
          <input
            type="search"
            name="q"
            defaultValue={search}
            placeholder="Subject, user, category, or ID"
            className="min-h-11 rounded-xl border border-brand-line bg-white px-3"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-brand-900">
          Status
          <select
            name="status"
            defaultValue={selectedStatus}
            className="min-h-11 rounded-xl border border-brand-line bg-white px-3"
          >
            <option value="all">All statuses</option>
            {validStatuses.map((status) => (
              <option key={status} value={status}>
                {status.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn btn-primary">
          Filter feedback
        </button>
      </form>
      {entries.length ? (
        <ul className="ui-card divide-y divide-brand-line overflow-hidden">
          {entries.map((entry) => (
            <li key={entry.id} className="p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                    {categoryLabels[entry.category] || 'Feedback'}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-brand-900">{entry.subject}</h2>
                  <p className="mt-1 text-sm text-brand-muted">
                    {entry.buyerName} · {entry.submitterRole === 'seller' ? 'Seller' : 'Buyer'}
                    {entry.buyerEmail ? ` · ${entry.buyerEmail}` : ''}
                  </p>
                  <p className="mt-1 text-xs text-brand-muted">Feedback {entry.id}</p>
                  <time dateTime={entry.createdAt} className="mt-1 block text-xs text-brand-muted">
                    Submitted {new Date(entry.createdAt).toLocaleString('en-PH')}
                  </time>
                </div>
                <StatusBadge status={entry.status} />
              </div>
              <details className="mt-4">
                <summary className="w-fit cursor-pointer text-sm font-semibold text-brand-700">
                  View complete feedback and previous responses
                </summary>
                <div className="mt-3 rounded-xl bg-[#f7fbf4] p-4">
                  <p className="whitespace-pre-wrap text-sm leading-6 text-brand-900">
                    {entry.message}
                  </p>
                  <div className="mt-4 border-t border-brand-line pt-3">
                    <h3 className="text-sm font-semibold text-brand-900">Response history</h3>
                    {entry.responseHistory.length ? (
                      <ol className="mt-2 space-y-3">
                        {entry.responseHistory.map((response, index) => (
                          <li
                            key={`${response.createdAt}-${index}`}
                            className="border-l-2 border-brand-100 pl-3"
                          >
                            <p className="whitespace-pre-wrap text-sm text-brand-900">
                              {response.response}
                            </p>
                            <p className="mt-1 text-xs text-brand-muted">
                              {response.adminName || 'Administrator'} ·{' '}
                              {response.createdAt
                                ? new Date(response.createdAt).toLocaleString('en-PH')
                                : 'Date unavailable'}
                            </p>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="mt-1 text-sm text-brand-muted">No response has been sent.</p>
                    )}
                  </div>
                </div>
              </details>
              <AdminAiAssist kind="feedback" recordId={entry.id} label="AI feedback summary" />
              <form
                action={respondToFeedbackAction}
                className="mt-5 grid gap-3 border-t border-brand-line pt-4"
              >
                <input type="hidden" name="feedbackId" value={entry.id} />
                <label className="grid gap-1 text-sm font-medium text-brand-900">
                  New administrator response{' '}
                  <span className="font-normal text-brand-muted">
                    (leave blank to update status only)
                  </span>
                  <textarea
                    name="response"
                    rows={4}
                    maxLength={5000}
                    className="rounded-xl border border-brand-line bg-white px-3 py-2"
                  />
                </label>
                <label className="grid max-w-xs gap-1 text-sm font-medium text-brand-900">
                  Status
                  <select
                    name="status"
                    defaultValue={entry.status}
                    className="min-h-11 rounded-xl border border-brand-line bg-white px-3"
                  >
                    <option value="pending">Pending</option>
                    <option value="under-review">Under Review</option>
                    <option value="responded">Responded</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </label>
                <button type="submit" className="btn btn-primary w-fit">
                  Save feedback update
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <div className="page-empty">No feedback submissions match these filters.</div>
      )}
    </DashboardShell>
  )
}
