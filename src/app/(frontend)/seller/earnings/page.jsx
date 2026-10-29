import { DashboardShell, peso } from '@/components/dashboard-shell'
import { DashboardPanel, StatCard } from '@/components/dashboard-ui'
import { requireApprovedSeller } from '@/server/guards'
import { sellerFinancials } from '@/server/seller'

export default async function SellerEarningsPage() {
  const user = await requireApprovedSeller()
  const finances = await sellerFinancials(user)

  return (
    <DashboardShell user={user} title="Earnings" subtitle="Totals from your completed orders in the marketplace.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Completed sales" value={peso(finances.gross)} />
        <StatCard label="Pending order value" value={peso(finances.pending)} />
        <StatCard label="Completed orders" value={finances.completedOrders} />
        <StatCard label="Open orders" value={finances.openOrders} />
      </div>
      <div className="mt-6">
        <DashboardPanel title="Transactions">
          <p className="text-sm text-[#647066]">
            Cash and electronic payments are recorded on each order. Collect pickup payments only after fulfillment
            rules allow it. Amounts reflect your line items, not other sellers on multi-seller carts.
          </p>
        </DashboardPanel>
      </div>
    </DashboardShell>
  )
}
