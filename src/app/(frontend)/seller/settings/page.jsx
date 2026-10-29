import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard-shell'
import { DashboardPanel } from '@/components/dashboard-ui'
import { SellerProfileForm } from '@/components/profile-forms'
import { requireSeller } from '@/server/guards'
import { sellerRecord } from '@/server/seller'
import { readyStore } from '@/server/store'

export default async function SellerSettingsPage() {
  const user = await requireSeller()
  const seller = sellerRecord(await readyStore(), user)
  if (!seller) redirect('/seller/dashboard')

  return (
    <DashboardShell user={user} title="Shop settings" subtitle="Manage your farm profile shown to buyers.">
      <DashboardPanel title="Farm profile">
        <SellerProfileForm seller={seller} />
      </DashboardPanel>
    </DashboardShell>
  )
}
