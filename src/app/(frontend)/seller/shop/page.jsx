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
    <DashboardShell user={user} title="My shop" subtitle="Farm profile buyers see on the marketplace.">
      {seller ? (
        <DashboardPanel fit title={seller.farmName} description="What buyers see, and the details you can update.">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <StatusBadge status={seller.status} />
            <Link href={`/sellers/${seller.id}`} className="text-sm font-bold text-[#4b9f30]">
              View public shop page →
            </Link>
          </div>
          <p className="mt-3 text-sm text-[#647066]">{seller.location}</p>
          <p className="mt-2 text-sm leading-6 text-[#647066]">{seller.description || 'Add a description for buyers.'}</p>
          <div className="mt-6 border-t border-[#d5e4d4] pt-6">
            <SellerProfileForm seller={seller} />
          </div>
        </DashboardPanel>
      ) : (
        <p className="text-sm text-[#647066]">Shop profile will appear after seller approval.</p>
      )}
    </DashboardShell>
  )
}
