import { DashboardShell } from '@/components/dashboard-shell'
import { DashboardPanel } from '@/components/dashboard-ui'
import { BuyerSettingsForm } from '@/components/buyer-settings-form'
import { requireApprovedBuyer } from '@/server/guards'

export default async function AccountSettingsPage() {
  const user = await requireApprovedBuyer('/account/settings')

  return (
    <DashboardShell user={user} title="Account settings" subtitle="Profile details and saved delivery locations.">
      <DashboardPanel fit title="Profile" description="Your name and the places you want orders delivered.">
        <BuyerSettingsForm user={user} />
      </DashboardPanel>
    </DashboardShell>
  )
}
