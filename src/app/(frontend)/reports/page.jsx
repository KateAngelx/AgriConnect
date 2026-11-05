import { submitBuyerReportAction } from '@/app/(frontend)/reports/actions'
import { DashboardShell } from '@/components/dashboard-shell'
import { PagedRows } from '@/components/paged-rows'
import { AlertBanner, StatusBadge } from '@/components/dashboard-ui'
import { requireApprovedBuyer } from '@/server/guards'
import { reportsForBuyer, reportOptions, BUYER_REPORT_TYPES } from '@/server/reports'

const reportTypeLabels = Object.fromEntries(BUYER_REPORT_TYPES.filter(([value]) => value !== 'buyer'))

export default async function BuyerReportsPage({ searchParams }) {
  const user = await requireApprovedBuyer('/reports')
  const query = await searchParams
  const [options, reports] = await Promise.all([
    reportOptions(user),
    reportsForBuyer(user),
  ])
  return (
    <DashboardShell user={user} title="Report an issue" subtitle="Submit a report and follow its status. Reports are visible only to you and authorized administrators.">
      {typeof query.error === 'string' ? (
        <div className="mb-4"><AlertBanner tone="error">{query.error}</AlertBanner></div>
      ) : null}
      {typeof query.success === 'string' ? (
        <div className="mb-4"><AlertBanner tone="success">{query.success}</AlertBanner></div>
      ) : null}
      <section className="ui-card p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-brand-900">Submit a report</h2>
        <form action={submitBuyerReportAction} className="mt-4 grid gap-4">
          <label className="grid gap-1 text-sm font-medium text-brand-900">
            Report type
            <select name="reportType" required className="min-h-11 rounded-xl border border-brand-line bg-white px-3">
              <option value="">Choose what you are reporting</option>
              {BUYER_REPORT_TYPES.filter(([value]) => value !== 'buyer').map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <input type="hidden" name="reporterRole" value="buyer" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-brand-900">
            Related item (if applicable)
            <select name="target" defaultValue="" className="min-h-11 rounded-xl border border-brand-line bg-white px-3">
              <option value="">No specific item / suspicious activity</option>
              {options.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <span className="text-xs font-normal text-brand-muted">
              Choose a related item for product, seller, order, or delivery-personnel reports. For suspicious activity, describe it below.
            </span>
          </label>
          <label className="grid gap-1 text-sm font-medium text-brand-900">
            Reason
            <input
              name="reason"
              required
              minLength={3}
              maxLength={160}
              className="min-h-11 rounded-xl border border-brand-line bg-white px-3"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium text-brand-900">
            Description <span className="font-normal text-brand-muted">(optional)</span>
            <textarea
              name="description"
              rows={5}
              maxLength={3000}
              className="rounded-xl border border-brand-line bg-white px-3 py-2"
            />
          </label>
          <button type="submit" className="btn btn-primary w-fit">Submit report</button>
        </form>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-lg font-semibold text-brand-900">Your reports</h2>
        {reports.length ? (
          <PagedRows asList={false} className="grid gap-4">
            {reports.map((report) => (
              <article key={report.id} className="ui-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                      {reportTypeLabels[report.reportType] || 'Report'}
                      {report.targetLabel ? ` · ${report.targetLabel}` : ''}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-brand-900">{report.reason}</h3>
                    <time dateTime={report.createdAt} className="mt-1 block text-xs text-brand-muted">
                      Submitted {new Date(report.createdAt).toLocaleString('en-PH')}
                    </time>
                  </div>
                  <StatusBadge status={report.status} />
                </div>
                {report.description ? (
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-brand-muted">{report.description}</p>
                ) : null}
                {report.adminResponse ? (
                  <div className="mt-4 rounded-xl border border-brand-line bg-[#f7fbf4] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Administrator response</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-brand-900">{report.adminResponse}</p>
                  </div>
                ) : null}
              </article>
            ))}
          </PagedRows>
        ) : (
          <div className="page-empty">You have not submitted any reports yet.</div>
        )}
      </section>
    </DashboardShell>
  )
}
