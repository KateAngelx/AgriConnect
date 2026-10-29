import { DashboardShell, peso, pretty } from '@/components/dashboard-shell'
import { DashboardPanel, DataTable, StatusBadge } from '@/components/dashboard-ui'
import { requireApprovedSeller } from '@/server/guards'
import { sellerSalesReport } from '@/server/seller'

export default async function SellerReportsPage() {
  const user = await requireApprovedSeller()
  const rows = await sellerSalesReport(user)

  return (
    <DashboardShell user={user} title="Sales reports" subtitle="Recent orders that include your products.">
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
