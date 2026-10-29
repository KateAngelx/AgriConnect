import { currentUser } from '@/server/auth'
import {
  assessApplicationEligibility,
  formatEligibilityAnswer,
} from '@/server/ai/application-eligibility'
import { aiConfigured, aiRateLimit, chatCompletion } from '@/server/ai/client'
import { hasRole } from '@/server/roles'
import { readyStore } from '@/server/store'

function sanitizePayload(payload) {
  const copy = { ...(payload || {}) }
  delete copy.password
  delete copy.passwordHash
  return copy
}

export async function POST(request) {
  const user = await currentUser()
  if (!user || !hasRole(user, 'admin')) {
    return Response.json({ error: 'Administrator access required.' }, { status: 403 })
  }
  if (!aiRateLimit(`admin-app:${user.id}`, 15)) {
    return Response.json({ error: 'Too many requests.' }, { status: 429 })
  }
  let body
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid body.' }, { status: 400 })
  }
  const applicationId = String(body.applicationId ?? '')
  const store = await readyStore()
  const application = store.applications.find((item) => item.id === applicationId)
  if (!application) return Response.json({ error: 'Application not found.' }, { status: 404 })
  const screening = assessApplicationEligibility(application)
  const facts = {
    type: application.applicationType,
    status: application.status,
    fields: sanitizePayload(application.payload),
    screening,
  }
  if (!aiConfigured()) {
    return Response.json({
      answer: formatEligibilityAnswer(screening, application),
      facts,
      source: 'database',
    })
  }
  const system = [
    'You assist administrators reviewing AgriConnect partner applications.',
    'Never approve or reject. Categorize as: Complete — Ready for Human Review, Missing Information, or Requires Additional Review.',
    'List missing fields and inconsistencies only from supplied data.',
    'Do not infer identity or fraud from names or writing style.',
  ].join(' ')
  const result = await chatCompletion({
    system,
    user: `Application facts:\n${JSON.stringify(facts)}`,
  })
  if (result.content) return Response.json({ answer: result.content, facts, source: 'ai+database' })
  return Response.json({
    answer: formatEligibilityAnswer(screening, application),
    facts,
    source: 'database',
    notice: result.error,
  })
}
