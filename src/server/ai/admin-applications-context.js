import { assessApplicationEligibility } from '@/server/ai/application-eligibility'
import { readyStore } from '@/server/store'

const ACTIVE = new Set(['pending', 'under-review', 'needs-info'])

export async function adminApplicationsFacts({ applicationId, limit = 12 } = {}) {
  const store = await readyStore()
  const applications = store.applications
    .filter((item) => ACTIVE.has(item.status))
    .slice(0, limit)
    .map((item) => {
      const user = store.users.get(item.userId)
      const screening = assessApplicationEligibility(item)
      return {
        id: item.id,
        type: item.applicationType,
        status: item.status,
        applicantName: user?.name || 'Unknown',
        applicantEmail: user?.email || '',
        fields: item.payload || {},
        screening,
      }
    })

  const focused = applicationId
    ? applications.find((item) => item.id === applicationId) ||
      (() => {
        const app = store.applications.find((item) => item.id === applicationId)
        if (!app) return null
        const user = store.users.get(app.userId)
        return {
          id: app.id,
          type: app.applicationType,
          status: app.status,
          applicantName: user?.name || 'Unknown',
          applicantEmail: user?.email || '',
          fields: app.payload || {},
          screening: assessApplicationEligibility(app),
        }
      })()
    : null

  return {
    generatedAt: new Date().toISOString(),
    pendingCount: store.applications.filter((item) => ACTIVE.has(item.status)).length,
    applications,
    focused,
  }
}
