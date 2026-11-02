import { DashboardShell } from '@/components/dashboard-shell'
import { DashboardPanel } from '@/components/dashboard-ui'
import { ServiceAreaForm } from '@/components/profile-forms'
import { requireDelivery } from '@/server/guards'

export default async function DeliverySettingsPage() {
  const user = await requireDelivery()

  return (
    <DashboardShell user={user} title="Settings" subtitle="Service area used when matching delivery jobs.">
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
