import { DashboardShell, greetingName, peso } from '@/components/dashboard-shell'
import {
  ActivityBars,
  ApplicationRow,
  DashboardHero,
  MetricTile,
  NotificationFeed,
  OverviewPanel,
  PromoBanner,
  QuickActions,
} from '@/components/dashboard-overview-ui'
import { DataTable } from '@/components/dashboard-ui'
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

  const firstName = greetingName(user.name)

  return (
    <DashboardShell user={user} title="" subtitle="" variant="overview">
      <div className="grid gap-5 lg:gap-6 xl:grid-cols-[minmax(0,1fr)_280px] 2xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5 sm:space-y-6">
          <DashboardHero
            label="Admin dashboard"
            title={`Good morning, ${firstName}!`}
            description="Review partner applications, monitor platform activity, and keep AgriConnect running smoothly."
            actionHref="/admin/applications"
            actionLabel="Review applications"
            imageUrl="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=800&q=80"
          />

          <section className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            <MetricTile label="Total users" value={summary.users} icon="users" tone="green" />
            <MetricTile
              label="Pending applications"
              value={summary.pending}
              hint={summary.pending ? 'Needs review' : 'All clear'}
              icon="clipboard"
              tone="amber"
            />
            <MetricTile label="Approved sellers" value={summary.approvedSellers} icon="store" tone="teal" />
            <MetricTile label="Delivery partners" value={summary.approvedDelivery} icon="truck" tone="blue" />
            <MetricTile label="Active products" value={summary.activeProducts} icon="package" tone="green" />
            <MetricTile label="Total orders" value={summary.orders} icon="clipboard" tone="slate" />
            <MetricTile
              label="Orders in progress"
              value={summary.ordersAttention}
              icon="boxes"
              tone="amber"
            />
            <MetricTile
              label="Paid transactions"
              value={summary.paidTransactions}
              hint={`${summary.payments} pending payment`}
              icon="wallet"
              tone="teal"
            />
          </section>

          <div className="grid gap-5 sm:gap-6 lg:grid-cols-2">
            <OverviewPanel title="Recent applications" href="/admin/applications">
              {applications.length ? (
                <DataTable columns={['Applicant', 'Submitted', 'Status']}>
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
              ) : (
                <p className="text-sm text-[#65766d]">No pending applications right now.</p>
              )}
            </OverviewPanel>

            <OverviewPanel title="Platform activity snapshot" href="/admin/reports">
              <p className="text-sm leading-6 text-[#65766d]">
                {summary.orders} total orders · {summary.ordersAttention} in progress · {summary.activeProducts}{' '}
                active products · {summary.paidTransactions} paid transactions. Seller shops manage their own products
                and order fulfillment.
              </p>
            </OverviewPanel>
          </div>

          <div className="grid gap-5 sm:gap-6 lg:grid-cols-2">
            <ActivityBars title="Platform activity" series={activity} />
            <QuickActions
              actions={[
                { label: 'Applications', href: '/admin/applications', icon: 'clipboard' },
                { label: 'Reports', href: '/admin/reports', icon: 'package' },
                { label: 'Accounts', href: '/admin/users', icon: 'users' },
                { label: 'Commission payouts', href: '/admin/payments', icon: 'wallet' },
              ]}
            />
          </div>

          <PromoBanner
            title="Platform integrations"
            body={
              integrations.supabase
                ? 'Supabase sync is active. Electronic checkout is ' +
                  (integrations.xendit ? 'enabled through Xendit.' : integrations.paymongo ? 'enabled through PayMongo.' : 'not configured yet.')
                : 'Connect Supabase and optional payment-provider keys to enable cloud sync and digital payments.'
            }
            href="/admin/payments"
            actionLabel="Open payments"
            imageUrl="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=900&q=80"
          />
        </div>

        <aside className="space-y-6">
          <NotificationFeed notes={notes.slice(0, 5)} />
        </aside>
      </div>
    </DashboardShell>
  )
}
