import { submitBuyerReportAction } from '@/app/(frontend)/reports/actions'
import { DashboardShell } from '@/components/dashboard-shell'
import { PagedRows } from '@/components/paged-rows'
import { AlertBanner, StatusBadge } from '@/components/dashboard-ui'
import { requireApprovedSeller } from '@/server/guards'
import { reportsForBuyer, reportOptions, reportTypesForRole } from '@/server/reports'

export default async function SellerIssuesPage({ searchParams }) {
  const user = await requireApprovedSeller()
  const query = await searchParams
  const [options, reports] = await Promise.all([
    reportOptions(user, 'seller'),
    reportsForBuyer(user),
  ])
  const sellerReports = reports.filter((report) => report.reporterRole === 'seller')
  const types = reportTypesForRole(user, 'seller')
  const typeLabels = Object.fromEntries(types)

  return (
    <DashboardShell user={user} title="Report an issue" subtitle="Report problematic buyers, order issues, delivery concerns, or suspicious activity related to your shop.">
      {typeof query.error === 'string' ? (
        <div className="mb-4"><AlertBanner tone="error">{query.error}</AlertBanner></div>
      ) : null}
      {typeof query.success === 'string' ? (
        <div className="mb-4"><AlertBanner tone="success">{query.success}</AlertBanner></div>
      ) : null}
      <section className="ui-card p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-brand-900">Submit a report</h2>
        <form action={submitBuyerReportAction} className="mt-4 grid gap-4">
          <input type="hidden" name="reporterRole" value="seller" />
          <label className="grid gap-1 text-sm font-medium text-brand-900">
            Report type
            <select name="reportType" required className="min-h-11 rounded-xl border border-brand-line bg-white px-3">
              <option value="">Choose what you are reporting</option>
              {types.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium text-brand-900">
            Related order, buyer, or delivery personnel
            <select name="target" defaultValue="" className="min-h-11 rounded-xl border border-brand-line bg-white px-3">
              <option value="">No specific item / suspicious activity</option>
              {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium text-brand-900">
            Reason
            <input name="reason" required minLength={3} maxLength={160} className="min-h-11 rounded-xl border border-brand-line bg-white px-3" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-brand-900">
            Description <span className="font-normal text-brand-muted">(optional)</span>
            <textarea name="description" rows={5} maxLength={3000} className="rounded-xl border border-brand-line bg-white px-3 py-2" />
          </label>
          <button type="submit" className="btn btn-primary w-fit">Submit report</button>
        </form>
      </section>
      <section className="mt-6">
        <h2 className="mb-3 text-lg font-semibold text-brand-900">Your reports</h2>
        {sellerReports.length ? (
          <PagedRows asList={false} className="grid gap-4">
            {sellerReports.map((report) => (
              <article key={report.id} className="ui-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                      {typeLabels[report.reportType] || 'Report'}{report.targetLabel ? ` · ${report.targetLabel}` : ''}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-brand-900">{report.reason}</h3>
                    <time dateTime={report.createdAt} className="mt-1 block text-xs text-brand-muted">
                      Submitted {new Date(report.createdAt).toLocaleString('en-PH')}
                    </time>
                  </div>
                  <StatusBadge status={report.status} />
                </div>
                {report.description ? <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-brand-muted">{report.description}</p> : null}
                {report.adminResponse ? (
                  <div className="mt-4 rounded-xl border border-brand-line bg-[#f7fbf4] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Administrator response</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-brand-900">{report.adminResponse}</p>
                  </div>
                ) : null}
              </article>
            ))}
          </PagedRows>
        ) : <div className="page-empty">You have not submitted any reports yet.</div>}
      </section>
    </DashboardShell>
  )
}
