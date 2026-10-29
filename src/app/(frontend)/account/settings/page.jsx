import Link from 'next/link'
import { DashboardShell } from '@/components/dashboard-shell'
import { DashboardPanel } from '@/components/dashboard-ui'
import { BuyerSettingsForm } from '@/components/buyer-settings-form'
import { requireApprovedBuyer } from '@/server/guards'

export default async function AccountSettingsPage() {
  const user = await requireApprovedBuyer('/account/settings')

  return (
    <DashboardShell user={user} title="Account settings" subtitle="Update your profile information used for orders and notifications.">
      <DashboardPanel title="Profile">
        <BuyerSettingsForm user={user} />
      </DashboardPanel>
      <p className="mt-4 text-sm text-[#647066]">
        <Link href="/account" className="font-bold text-[#4b9f30]">
          ← Back to account overview
        </Link>
      </p>
    </DashboardShell>
  )
}
