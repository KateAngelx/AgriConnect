import { DashboardShell, peso, pretty } from '@/components/dashboard-shell'
import { PeriodFilter } from '@/components/period-filter'
import { DashboardPanel, DataTable, StatusBadge } from '@/components/dashboard-ui'
import { periodLabel, readPeriod } from '@/lib/report-period'
import { requireApprovedSeller } from '@/server/guards'
import { sellerSalesReport } from '@/server/seller'

export default async function SellerReportsPage({ searchParams }) {
  const user = await requireApprovedSeller()
  const query = await searchParams
  const period = readPeriod(query.period)
  const rows = await sellerSalesReport(user, period)

  return (
    <DashboardShell user={user} title="Sales reports" subtitle={`${periodLabel(period)} · orders that include your products in this range.`}>
      <div className="mb-6">
        <PeriodFilter period={period} pathname="/seller/reports" />
      </div>
      <DashboardPanel title="Recent sales">
        {rows.length ? (
          <DataTable columns={['Order', 'Total', 'Payment', 'Status', 'Date']}>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-5 py-3 font-semibold">{row.reference}</td>
                <td className="px-5 py-3">{peso(row.total)}</td>
                <td className="px-5 py-3 capitalize">{pretty(row.paymentStatus)}</td>
                <td className="px-5 py-3">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-5 py-3 text-[#647066]">
                  {row.createdAt ? new Date(row.createdAt).toLocaleDateString('en-PH') : '—'}
                </td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <p className="text-sm text-[#65766d]">Sales will appear when buyers order your products.</p>
        )}
      </DashboardPanel>
    </DashboardShell>
  )
}
