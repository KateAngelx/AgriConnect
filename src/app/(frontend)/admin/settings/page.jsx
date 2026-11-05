import { DashboardShell } from '@/components/dashboard-shell'
import { AlertBanner, DashboardPanel } from '@/components/dashboard-ui'
import { AiIntegrationPanel } from '@/components/ai-integration-panel'
import { describeIntegrations } from '@/server/sync'
import { requireAdmin } from '@/server/guards'
import { readyStore } from '@/server/store'
import { commissionRateFrom, DELIVERY_FEE } from '@/server/payments'
import { updatePlatformFeeAction } from '../actions'

export default async function AdminSettingsPage({ searchParams }) {
  const user = await requireAdmin()
  const query = await searchParams
  const error = typeof query.error === 'string' ? query.error : ''
  const success = typeof query.success === 'string' ? query.success : ''
  const [integrations, store] = await Promise.all([describeIntegrations(), readyStore()])
  const commissionRate = commissionRateFrom(store)

  return (
    <DashboardShell
      user={user}
      title="Settings"
      subtitle="Platform configuration organized by operational area."
    >
      {error ? (
        <div className="mb-4">
          <AlertBanner tone="error">{error}</AlertBanner>
        </div>
      ) : null}
      {success ? (
        <div className="mb-4">
          <AlertBanner tone="success">{success}</AlertBanner>
        </div>
      ) : null}
      <DashboardPanel
        title="Platform settings"
        description="Existing settings and integrations, grouped by function. Current workflow behavior is preserved."
      >
        <div className="grid gap-3 lg:grid-cols-2">
          <SettingsSection title="General Settings" open>
            <SettingLine
              label="Supabase sync"
              value={integrations.supabase ? 'Connected' : 'Not configured in this environment'}
            />
            <SettingLine
              label="Phone verification"
              value={integrations.phoneOtp ? 'Enabled' : 'Off (email registration)'}
            />
          </SettingsSection>

          <SettingsSection title="User and Role Settings">
            <p>
              Buyers retain buyer access. Seller and delivery access continue to use the existing
              application and administrator approval workflows.
            </p>
            <a
              href="/admin/applications"
              className="mt-3 inline-block font-semibold text-brand-700"
            >
              Review role applications
            </a>
          </SettingsSection>

          <SettingsSection title="Delivery Fee Settings">
            <SettingLine label="Current delivery fee" value={`₱${DELIVERY_FEE} per delivery`} />
            <p>
              The existing checkout fee is defined in application configuration; no editable fee
              setting is currently provided.
            </p>
          </SettingsSection>

          <SettingsSection title="Platform Commission Settings">
            <p>Current rate: ₱{commissionRate} per item (₱0–₱50 range).</p>
            <form
              action={updatePlatformFeeAction}
              className="mt-3 flex max-w-sm flex-wrap items-center gap-2"
            >
              <label htmlFor="commissionRate" className="sr-only">
                Commission per item
              </label>
              <input
                id="commissionRate"
                type="number"
                name="commissionRate"
                min={0}
                max={50}
                step={1}
                defaultValue={commissionRate}
                required
                className="ui-field w-24 text-center"
              />
              <span>₱ per item</span>
              <button type="submit" className="btn btn-dark">
                Update rate
              </button>
            </form>
          </SettingsSection>

          <SettingsSection title="Payment Settings">
            <SettingLine
              label="Electronic checkout"
              value={
                integrations.xendit
                  ? 'Xendit enabled'
                  : integrations.paymongo
                    ? 'PayMongo enabled'
                    : 'Not configured'
              }
            />
            <p>
              Payment providers are controlled by server environment configuration. A pending
              transaction is not marked paid by this settings page.
            </p>
            <a href="/admin/payments" className="mt-3 inline-block font-semibold text-brand-700">
              View transactions and payouts
            </a>
          </SettingsSection>

          <SettingsSection title="Notification Settings">
            <p>
              Order, payment, delivery, application, feedback, and report notifications use the
              existing event-driven workflows. No global notification preference is currently
              configurable.
            </p>
          </SettingsSection>

          <SettingsSection title="AI Settings">
            <SettingLine
              label="Current mode"
              value={
                integrations.aiMode === 'database'
                  ? 'Live data only (no LLM API)'
                  : `${integrations.aiMode} + live data`
              }
            />
            <p>
              AI assistance provides recommendations only. Administrators make all application,
              moderation, feedback, and report decisions.
            </p>
            <div className="mt-4 border-t border-brand-line pt-4">
              <AiIntegrationPanel />
            </div>
          </SettingsSection>
        </div>
        <p className="mt-6 border-t border-[#d5e4d4] pt-6 text-sm leading-6 text-[#647066]">
          Platform administrators review applications, monitor marketplace activity, manage account
          access, and process courier commission payouts. Individual seller products, inventory, and
          order fulfillment remain the responsibility of each approved seller.
        </p>
      </DashboardPanel>
    </DashboardShell>
  )
}

function SettingsSection({ title, children, open = false }) {
  return (
    <details open={open} className="ui-card overflow-hidden">
      <summary className="cursor-pointer list-none border-b border-brand-line bg-[#f7fbf4] px-4 py-3 font-semibold text-brand-900">
        {title}
      </summary>
      <div className="space-y-2 p-4 text-sm leading-6 text-brand-muted">{children}</div>
    </details>
  )
}

function SettingLine({ label, value }) {
  return (
    <p>
      <strong className="text-brand-900">{label}:</strong> {value}
    </p>
  )
}
