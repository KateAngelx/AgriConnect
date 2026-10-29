import Link from 'next/link'
import { DashboardShell } from '@/components/dashboard-shell'
import { DashboardPanel, StatusBadge } from '@/components/dashboard-ui'
import { SellerProfileForm } from '@/components/profile-forms'
import { requireSeller } from '@/server/guards'
import { sellerRecord } from '@/server/seller'
import { readyStore } from '@/server/store'

export default async function SellerShopPage() {
  const user = await requireSeller()
  const store = await readyStore()
  const seller = sellerRecord(store, user)

  return (
    <DashboardShell user={user} title="My shop" subtitle="Your public farm profile and shop details.">
      {seller ? (
        <>
          <DashboardPanel title={seller.farmName}>
            <StatusBadge status={seller.status} />
            <p className="mt-3 text-sm text-[#647066]">{seller.location}</p>
            <p className="mt-2 text-sm leading-6 text-[#647066]">{seller.description || 'Add a description for buyers.'}</p>
            <Link href={`/sellers/${seller.id}`} className="mt-4 inline-block text-sm font-bold text-[#4b9f30]">
              View public shop page →
            </Link>
          </DashboardPanel>
          <div className="mt-6">
            <DashboardPanel title="Update shop profile">
              <SellerProfileForm seller={seller} />
            </DashboardPanel>
          </div>
        </>
      ) : (
        <p className="text-sm text-[#647066]">Shop profile will appear after seller approval.</p>
      )}
    </DashboardShell>
  )
}
