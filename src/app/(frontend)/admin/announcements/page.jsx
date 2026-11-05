import { publishSellerAnnouncementAction } from '@/app/(frontend)/admin/announcements/actions'
import { DashboardShell } from '@/components/dashboard-shell'
import { AlertBanner } from '@/components/dashboard-ui'
import { requireAdmin } from '@/server/guards'
import { readyStore } from '@/server/store'
import { isApprovedDelivery, isApprovedSeller } from '@/server/roles'

export default async function AdminAnnouncementsPage({ searchParams }) {
  const user = await requireAdmin()
  const query = await searchParams
  const store = await readyStore()
  const sellerCount = [...store.users.values()].filter(isApprovedSeller).length
  const deliveryCount = [...store.users.values()].filter(isApprovedDelivery).length
  return (
    <DashboardShell user={user} title="Administrator announcements" subtitle="Send an announcement to approved sellers, delivery personnel, or both.">
      {typeof query.error === 'string' ? (
        <div className="mb-4"><AlertBanner tone="error">{query.error}</AlertBanner></div>
      ) : null}
      {typeof query.success === 'string' ? (
        <div className="mb-4"><AlertBanner tone="success">{query.success}</AlertBanner></div>
      ) : null}
      <section className="ui-card max-w-3xl p-5 sm:p-6">
        <p className="text-sm text-brand-muted">
          Current audience sizes: {sellerCount} approved seller{sellerCount === 1 ? '' : 's'} and {deliveryCount} approved delivery account{deliveryCount === 1 ? '' : 's'}.
        </p>
        <form action={publishSellerAnnouncementAction} className="mt-4 grid gap-4">
          <label className="grid gap-1 text-sm font-medium text-brand-900">
            Audience
            <select name="audience" defaultValue="sellers" required className="min-h-11 rounded-xl border border-brand-line bg-white px-3">
              <option value="sellers">Approved sellers</option>
              <option value="delivery">Approved delivery personnel</option>
              <option value="both">Sellers and delivery personnel</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium text-brand-900">
            Announcement title
            <input name="title" required minLength={3} maxLength={120} className="min-h-11 rounded-xl border border-brand-line bg-white px-3" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-brand-900">
            Message
            <textarea name="message" required minLength={10} maxLength={2000} rows={5} className="rounded-xl border border-brand-line bg-white px-3 py-2" />
          </label>
          <button type="submit" className="btn btn-primary w-fit">Send announcement</button>
        </form>
      </section>
    </DashboardShell>
  )
}
