import { updateBuyerReportAction } from '@/app/(frontend)/admin/buyer-reports/actions'
import { DashboardShell } from '@/components/dashboard-shell'
import { AlertBanner, StatusBadge } from '@/components/dashboard-ui'
import { AdminAiAssist } from '@/components/admin-ai-assist'
import { requireAdmin } from '@/server/guards'
import { reportsForAdmin, BUYER_REPORT_TYPES } from '@/server/reports'

const reportTypeLabels = Object.fromEntries(BUYER_REPORT_TYPES)

export default async function AdminBuyerReportsPage({ searchParams }) {
  const user = await requireAdmin()
  const query = await searchParams
  const targetId = typeof query.targetId === 'string' ? query.targetId : ''
  const search = typeof query.q === 'string' ? query.q.trim().toLowerCase() : ''
  const validStatuses = ['pending', 'under-review', 'resolved', 'rejected']
  const selectedStatus = validStatuses.includes(query.status) ? query.status : 'all'
  const allReports = await reportsForAdmin(user)
  const reports = allReports.filter((report) => {
    const matchesTarget = !targetId || report.targetId === targetId
    const matchesSearch =
      !search ||
      [report.id, report.buyerName, report.targetLabel, report.reason].some((value) =>
        String(value || '')
          .toLowerCase()
          .includes(search),
      )
    return (
      matchesTarget &&
      matchesSearch &&
      (selectedStatus === 'all' || report.status === selectedStatus)
    )
  })
  return (
    <DashboardShell
      user={user}
      title="Report management"
      subtitle={
        targetId
          ? 'Privately review reports for this marketplace item, record investigation actions, and update the status.'
          : 'Privately investigate buyer and seller reports, record administrative actions, and update status.'
      }
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
        {targetId ? <input type="hidden" name="targetId" value={targetId} /> : null}
        <label className="grid gap-1 text-sm font-medium text-brand-900">
          Search reports
          <input
            type="search"
            name="q"
            defaultValue={search}
            placeholder="Report, user, target, or reason"
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
          Filter reports
        </button>
      </form>
      {targetId ? (
        <p className="mb-4 text-sm text-brand-muted">
          {reports.length} matching report{reports.length === 1 ? '' : 's'} ·{' '}
          <a href="/admin/buyer-reports" className="font-semibold text-brand-700">
            View all reports
          </a>
        </p>
      ) : null}
      {reports.length ? (
        <ul className="ui-card divide-y divide-brand-line overflow-hidden">
          {reports.map((report) => (
            <li key={report.id} className="p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                    {report.reporterRole === 'seller' ? 'Seller report' : 'Buyer report'}
                    {' · '}
                    {reportTypeLabels[report.reportType] || 'Report'}
                    {report.targetLabel ? ` · ${report.targetLabel}` : ''}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-brand-900">{report.reason}</h2>
                  <p className="mt-1 text-xs text-brand-muted">Report {report.id}</p>
                  <p className="mt-1 text-sm text-brand-muted">
                    {report.buyerName}
                    {report.reporterRole === 'seller' ? ' · Seller' : ' · Buyer'}
                    {report.buyerEmail ? ` · ${report.buyerEmail}` : ''}
                  </p>
                  <time dateTime={report.createdAt} className="mt-1 block text-xs text-brand-muted">
                    Submitted {new Date(report.createdAt).toLocaleString('en-PH')}
                  </time>
                </div>
                <StatusBadge status={report.status} />
              </div>
              <details className="mt-4">
                <summary className="w-fit cursor-pointer text-sm font-semibold text-brand-700">
                  View report details and action history
                </summary>
                <div className="mt-3 rounded-xl bg-[#f7fbf4] p-4">
                  <p className="text-sm font-semibold text-brand-900">
                    Reported target:{' '}
                    {report.targetLabel ||
                      (report.reportType === 'suspicious-activity'
                        ? 'Suspicious activity'
                        : 'Not specified')}
                  </p>
                  {report.targetId ? (
                    <p className="mt-1 break-all text-xs text-brand-muted">
                      Target ID: {report.targetId}
                    </p>
                  ) : null}
                  {report.reportType === 'product' && report.targetId ? (
                    <a
                      href={`/admin/products?q=${encodeURIComponent(report.targetId)}`}
                      className="mt-2 inline-block text-sm font-semibold text-brand-700"
                    >
                      Review listing and availability
                    </a>
                  ) : null}
                  {['buyer', 'delivery-personnel'].includes(report.reportType) &&
                  report.targetId ? (
                    <a
                      href={`/admin/users?q=${encodeURIComponent(report.targetId)}`}
                      className="mt-2 inline-block text-sm font-semibold text-brand-700"
                    >
                      Review reported account
                    </a>
                  ) : null}
                  {report.description ? (
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-brand-900">
                      {report.description}
                    </p>
                  ) : (
                    <p className="mt-3 text-sm text-brand-muted">No additional description.</p>
                  )}
                  <div className="mt-4 border-t border-brand-line pt-3">
                    <h3 className="text-sm font-semibold text-brand-900">
                      Administrative action history
                    </h3>
                    {report.administrativeActions.length ? (
                      <ol className="mt-2 space-y-3">
                        {report.administrativeActions.map((entry, index) => (
                          <li
                            key={`${entry.createdAt}-${index}`}
                            className="border-l-2 border-brand-100 pl-3"
                          >
                            <p className="whitespace-pre-wrap text-sm text-brand-900">
                              {entry.action}
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
                        No administrative action has been recorded.
                      </p>
                    )}
                  </div>
                  {report.adminResponse ? (
                    <div className="mt-4 border-t border-brand-line pt-3">
                      <h3 className="text-sm font-semibold text-brand-900">
                        Previous response to reporter
                      </h3>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-brand-900">
                        {report.adminResponse}
                      </p>
                    </div>
                  ) : null}
                </div>
              </details>
              <AdminAiAssist kind="report" recordId={report.id} label="AI report categorization" />
              <form
                action={updateBuyerReportAction}
                className="mt-5 grid gap-3 border-t border-brand-line pt-4"
              >
                <input type="hidden" name="reportId" value={report.id} />
                <label className="grid gap-1 text-sm font-medium text-brand-900">
                  New response to reporter{' '}
                  <span className="font-normal text-brand-muted">(optional)</span>
                  <textarea
                    name="response"
                    rows={4}
                    maxLength={5000}
                    className="rounded-xl border border-brand-line bg-white px-3 py-2"
                  />
                </label>
                <label className="grid gap-1 text-sm font-medium text-brand-900">
                  Record administrative action{' '}
                  <span className="font-normal text-brand-muted">(private; optional)</span>
                  <textarea
                    name="administrativeAction"
                    rows={3}
                    maxLength={2000}
                    className="rounded-xl border border-brand-line bg-white px-3 py-2"
                  />
                </label>
                <label className="grid max-w-xs gap-1 text-sm font-medium text-brand-900">
                  Status
                  <select
                    name="status"
                    defaultValue={report.status}
                    className="min-h-11 rounded-xl border border-brand-line bg-white px-3"
                  >
                    <option value="pending">Pending</option>
                    <option value="under-review">Under Review</option>
                    <option value="resolved">Resolved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </label>
                <button type="submit" className="btn btn-primary w-fit">
                  Save report update
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <div className="page-empty">
          {targetId ? 'There are no reports for this item.' : 'There are no buyer reports.'}
        </div>
      )}
    </DashboardShell>
  )
}
