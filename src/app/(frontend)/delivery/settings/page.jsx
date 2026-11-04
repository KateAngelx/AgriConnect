import { DashboardShell } from '@/components/dashboard-shell'
import { DashboardPanel, workStackClass } from '@/components/dashboard-ui'
import { ServiceAreaForm } from '@/components/profile-forms'
import { requireDelivery } from '@/server/guards'

export default async function DeliverySettingsPage() {
  const user = await requireDelivery()

  return (
    <DashboardShell user={user} title="Settings" subtitle="Service area used when matching delivery jobs.">
      <div className={workStackClass}>
      <DashboardPanel title="Service area" description="Where you can pick up and deliver orders.">
        <ServiceAreaForm
          area={user.serviceArea || ''}
          lat={user.serviceAreaLat}
          lng={user.serviceAreaLng}
          locations={user.savedAddresses}
        />
      </DashboardPanel>
      </div>
    </DashboardShell>
  )
}
