import { DashboardShell, peso } from '@/components/dashboard-shell'
import {
  ActivityBars,
  MetricBoard,
  MetricTile,
  NotificationFeed,
  QuickActions,
} from '@/components/dashboard-overview-ui'
import { StatusBadge, WorkSection, workStackClass } from '@/components/dashboard-ui'
import { adminOrderActivity, adminSnapshot, listRecentApplications } from '@/server/admin'
import { requireAdmin } from '@/server/guards'
import { listNotifications } from '@/server/notifications'
import { describeIntegrations } from '@/server/sync'

export default async function AdminDashboardPage() {
  const user = await requireAdmin()

  const [summary, applications, activity, notes, integrations] = await Promise.all([
    adminSnapshot(),
    listRecentApplications(5),
    adminOrderActivity(),
    listNotifications(user.id),
    describeIntegrations(),
  ])

  return (
    <DashboardShell
      user={user}
      title="Overview"
      subtitle="Approvals, live orders, and payments that need attention."
      variant="overview"
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px] 2xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          <MetricBoard>
            <MetricTile
              section="Accounts"
              label="Total users"
              value={summary.users}
              icon="users"
              tone="slate"
            />
            <MetricTile
              section="Accounts"
              label="Total buyers"
              value={summary.buyers}
              icon="user"
              tone="blue"
            />
            <MetricTile
              section="Accounts"
              label="Total sellers"
              value={summary.sellers}
              icon="store"
              tone="teal"
            />
            <MetricTile
              section="Accounts"
              label="Total delivery personnel"
              value={summary.deliveryPersonnel}
              icon="truck"
              tone="blue"
            />
            <MetricTile
              section="Marketplace"
              label="Total products"
              value={summary.products}
              icon="package"
              tone="green"
            />
            <MetricTile
              section="Marketplace"
              label="Total orders"
              value={summary.orders}
              icon="boxes"
              tone="amber"
            />
            <MetricTile
              section="Payments"
              label="Total transactions"
              value={summary.transactions}
              icon="wallet"
              tone="teal"
            />
            <MetricTile
              section="Queue"
              label="Pending applications"
              value={summary.pending}
              icon="clipboard"
              tone="amber"
            />
            <MetricTile
              section="Queue"
              label="Pending reports"
              value={summary.pendingReports}
              icon="clipboard"
              tone="amber"
            />
            <MetricTile
              section="Queue"
              label="Unresolved feedback"
              value={summary.unresolvedFeedback}
              icon="clipboard"
              tone="amber"
            />
          </MetricBoard>
          <section className="ui-card grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-4">
            <SystemStat label="Active products" value={summary.activeProducts} />
            <SystemStat label="Orders needing attention" value={summary.ordersAttention} />
            <SystemStat label="Pending transactions" value={summary.payments} />
            <SystemStat label="Paid transactions" value={summary.paidTransactions} />
          </section>

          <div className={workStackClass}>
            <WorkSection
              title="Waiting for approval"
              description="Pending, under-review, and information-requested applications."
              count={applications.length}
              href="/admin/applications"
              linkLabel="Open approvals"
              empty={<p className="text-sm text-[#5c6f62]">No application is waiting.</p>}
            >
              <ul className="divide-y divide-[#d5e4d4]">
                {applications.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex w-full flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-[#142016]">
                        {entry.user?.name || 'Applicant'}
                      </p>
                      <p className="text-[13px] text-[#5c6f62]">
                        {entry.applicationType} ·{' '}
                        {entry.createdAt
                          ? new Date(entry.createdAt).toLocaleDateString('en-PH')
                          : '—'}
                      </p>
                    </div>
                    <StatusBadge status={entry.status} />
                  </li>
                ))}
              </ul>
            </WorkSection>
            <ActivityBars
              title="Orders placed"
              series={activity}
              caption="Orders placed on each of the last 7 days."
            />
          </div>

          <p className="text-[13px] text-[#5c6f62]">
            {integrations.supabase
              ? `Cloud sync is active. Electronic checkout is ${integrations.xendit ? 'enabled through Xendit' : integrations.paymongo ? 'enabled through PayMongo' : 'not configured yet'}. ${summary.activeProducts} products are live, and sellers fulfill their own orders.`
              : `Cloud sync or a payment provider still needs to be connected before digital payments can run. ${summary.activeProducts} products are live.`}
          </p>
        </div>

        <aside className="space-y-4">
          <NotificationFeed notes={notes} />
          <QuickActions
            columns={1}
            actions={[
              {
                section: 'Approving',
                label: 'Approvals',
                href: '/admin/applications',
                icon: 'clipboard',
              },
              { section: 'Approving', label: 'Accounts', href: '/admin/users', icon: 'users' },
              {
                section: 'Monitoring',
                label: 'Products',
                href: '/admin/products',
                icon: 'package',
              },
              { section: 'Monitoring', label: 'Orders', href: '/admin/orders', icon: 'clipboard' },
              {
                section: 'Monitoring',
                label: 'Review moderation',
                href: '/admin/reviews',
                icon: 'clipboard',
              },
              {
                section: 'Case management',
                label: 'Feedback management',
                href: '/admin/feedback',
                icon: 'clipboard',
              },
              {
                section: 'Case management',
                label: 'Report management',
                href: '/admin/buyer-reports',
                icon: 'clipboard',
              },
              {
                section: 'Approving',
                label: 'Administrator announcements',
                href: '/admin/announcements',
                icon: 'bell',
              },
              {
                section: 'Payments',
                label: 'Transactions and payouts',
                href: '/admin/payments',
                icon: 'wallet',
              },
              { section: 'Payments', label: 'Reports', href: '/admin/reports', icon: 'package' },
            ]}
          />
        </aside>
      </div>
    </DashboardShell>
  )
}

function SystemStat({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">{label}</p>
      <p className="mt-1 text-xl font-bold text-brand-900">{value}</p>
    </div>
  )
}
