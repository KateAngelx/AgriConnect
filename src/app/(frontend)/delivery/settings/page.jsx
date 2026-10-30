import { DashboardShell } from '@/components/dashboard-shell'
import { DashboardPanel } from '@/components/dashboard-ui'
import { ServiceAreaForm } from '@/components/profile-forms'
import { requireDelivery } from '@/server/guards'

export default async function DeliverySettingsPage() {
  const user = await requireDelivery()

  return (
    <DashboardShell user={user} title="Profile settings" subtitle="Update the service area shown to administrators and buyers.">
      <DashboardPanel title="Service area">
        <ServiceAreaForm
          area={user.serviceArea || ''}
          lat={user.serviceAreaLat}
          lng={user.serviceAreaLng}
          locations={user.savedAddresses}
        />
      </DashboardPanel>
    </DashboardShell>
  )
}
