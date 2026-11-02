import { DashboardShell } from '@/components/dashboard-shell'
import {
  ActivityBars,
  ApplicationRow,
  MetricSection,
  MetricTile,
  NotificationFeed,
  QuickActions,
} from '@/components/dashboard-overview-ui'
import { DataTable, WorkSection } from '@/components/dashboard-ui'
import {
  adminOrderActivity,
  adminSnapshot,
  listRecentApplications,
} from '@/server/admin'
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
      <div className="grid gap-5 lg:gap-6 xl:grid-cols-[minmax(0,1fr)_280px] 2xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5 sm:space-y-6">
          <MetricSection title="Approving">
            <MetricTile
              label="Waiting for approval"
              value={summary.pending}
              hint={summary.pending ? 'Needs a decision' : 'Queue is clear'}
              icon="clipboard"
              tone="amber"
            />
            <MetricTile label="Approved sellers" value={summary.approvedSellers} icon="store" tone="teal" />
            <MetricTile label="Delivery partners" value={summary.approvedDelivery} icon="truck" tone="blue" />
          </MetricSection>

          <MetricSection title="Orders" className="grid-cols-2">
            <MetricTile label="Active orders" value={summary.ordersAttention} hint="Not delivered or completed" icon="boxes" tone="amber" />
            <MetricTile
              label="Closed orders"
              value={summary.orders - summary.ordersAttention}
              hint="Delivered, completed, or cancelled"
              icon="package"
              tone="green"
            />
          </MetricSection>

          <MetricSection title="Payments" className="grid-cols-2">
            <MetricTile label="Pending buyer payments" value={summary.payments} icon="wallet" tone="amber" />
            <MetricTile label="Paid buyer payments" value={summary.paidTransactions} icon="coin" tone="teal" />
          </MetricSection>

          <WorkSection
            title="Waiting for approval"
            description="Pending and under-review partner applications."
            count={applications.length}
            href="/admin/applications"
            linkLabel="Open approvals"
            empty={<p className="text-sm text-[#5c6f62]">No application is waiting.</p>}
          >
            <div className="ui-card overflow-hidden">
              <DataTable embedded columns={['Applicant', 'Submitted', 'Status']}>
                {applications.map((entry) => (
                  <ApplicationRow
                    key={entry.id}
                    name={entry.user?.name || 'Applicant'}
                    role={entry.applicationType}
                    date={entry.createdAt ? new Date(entry.createdAt).toLocaleDateString('en-PH') : '—'}
                    status={entry.status}
                  />
                ))}
              </DataTable>
            </div>
          </WorkSection>

          <div className="grid gap-5 sm:gap-6 lg:grid-cols-2">
            <ActivityBars title="Orders placed" series={activity} />
            <QuickActions
              actions={[
                { section: 'Approving', label: 'Approvals', href: '/admin/applications', icon: 'clipboard' },
                { section: 'Approving', label: 'Accounts', href: '/admin/users', icon: 'users' },
                { section: 'Payments', label: 'Commission payouts', href: '/admin/payments', icon: 'wallet' },
                { section: 'Payments', label: 'Reports', href: '/admin/reports', icon: 'package' },
              ]}
            />
          </div>

          <p className="text-[13px] text-[#5c6f62]">
            {integrations.supabase
              ? `Cloud sync is active. Electronic checkout is ${integrations.xendit ? 'enabled through Xendit' : integrations.paymongo ? 'enabled through PayMongo' : 'not configured yet'}. ${summary.activeProducts} products are live, and sellers fulfill their own orders.`
              : `Cloud sync or a payment provider still needs to be connected before digital payments can run. ${summary.activeProducts} products are live.`}
          </p>
        </div>

        <aside className="space-y-6">
          <NotificationFeed notes={notes.slice(0, 5)} />
        </aside>
      </div>
    </DashboardShell>
  )
}
