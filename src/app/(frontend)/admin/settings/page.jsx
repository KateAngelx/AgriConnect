import { DashboardShell } from '@/components/dashboard-shell'
import { DashboardPanel } from '@/components/dashboard-ui'
import { AiIntegrationPanel } from '@/components/ai-integration-panel'
import { describeIntegrations } from '@/server/sync'
import { requireAdmin } from '@/server/guards'

export default async function AdminSettingsPage() {
  const user = await requireAdmin()
  const integrations = await describeIntegrations()

  return (
    <DashboardShell user={user} title="Platform settings" subtitle="Administrative preferences and integration status.">
      <DashboardPanel title="Integrations">
        <ul className="space-y-3 text-sm text-[#647066]">
          <li>
            <strong className="text-[#142016]">Supabase sync:</strong>{' '}
            {integrations.supabase ? 'Connected' : 'Not configured in this environment'}
          </li>
          <li>
            <strong className="text-[#142016]">Electronic checkout:</strong>{' '}
            {integrations.xendit ? 'Xendit enabled' : integrations.paymongo ? 'PayMongo enabled' : 'Not configured'}
          </li>
          <li>
            <strong className="text-[#142016]">AI assistant:</strong>{' '}
            {integrations.aiMode === 'database'
              ? 'Live data only (free — no LLM API)'
              : `${integrations.aiMode} + live data`}
          </li>
          <li>
            <strong className="text-[#142016]">Phone OTP:</strong>{' '}
            {integrations.phoneOtp ? 'Enabled' : 'Off (email registration)'}
          </li>
        </ul>
      </DashboardPanel>
      <DashboardPanel title="AI assistant (Google Gemini & others)">
        <AiIntegrationPanel />
      </DashboardPanel>
      <DashboardPanel title="Administrator scope">
        <p className="text-sm leading-6 text-[#647066]">
          Platform administrators review applications, monitor marketplace activity, manage account access, and
          process courier commission payouts. Individual seller products, inventory, and order fulfillment remain
          the responsibility of each approved seller.
        </p>
      </DashboardPanel>
    </DashboardShell>
  )
}
