import { isApprovedAdmin, isApprovedBuyer, isApprovedSeller } from './roles'
import { notify } from './notifications'
import { save } from './sync'
import { freshStore } from './store'
import { getSupabaseAdmin, supabaseEnv } from '@/lib/supabase'

export const FEEDBACK_CATEGORIES = [
  ['general-feedback', 'General Feedback'],
  ['suggestion', 'Suggestions'],
  ['bug-report', 'Bug Reports'],
  ['user-experience', 'User Experience Feedback'],
  ['other-concern', 'Other Concerns'],
]

const feedbackCategoryValues = new Set(FEEDBACK_CATEGORIES.map(([value]) => value))
const feedbackStatuses = new Set(['pending', 'under-review', 'responded', 'resolved'])

export function normalizeFeedbackStatus(status) {
  if (status === 'submitted') return 'pending'
  if (status === 'in-review') return 'under-review'
  return feedbackStatuses.has(status) ? status : ''
}

function canSubmitFeedback(user) {
  return isApprovedBuyer(user) || isApprovedSeller(user)
}

export async function submitFeedback(user, input) {
  if (!canSubmitFeedback(user))
    return { error: 'Only approved buyers and sellers can submit feedback.' }
  const subject = String(input.subject || '').trim()
  const category = String(input.category || '')
  const message = String(input.message || '').trim()
  if (subject.length < 3 || subject.length > 120) {
    return { error: 'Subject must be between 3 and 120 characters.' }
  }
  if (!feedbackCategoryValues.has(category)) return { error: 'Choose a valid feedback category.' }
  if (message.length < 10 || message.length > 5000) {
    return { error: 'Message must be between 10 and 5,000 characters.' }
  }

  const store = await freshStore()
  const now = new Date().toISOString()
  const entry = {
    id: crypto.randomUUID(),
    userId: user.id,
    submitterRole: input.submitterRole === 'seller' && isApprovedSeller(user) ? 'seller' : 'buyer',
    subject,
    category,
    message,
    status: 'pending',
    adminResponse: '',
    responseHistory: [],
    createdAt: now,
    updatedAt: now,
    respondedAt: '',
  }
  store.feedback ??= []
  store.feedback.push(entry)
  await save()
  return { ok: true, entry }
}

export async function feedbackForBuyer(user) {
  if (!canSubmitFeedback(user)) return []
  const store = await freshStore()
  return (store.feedback || [])
    .filter((entry) => entry.userId === user.id)
    .map((entry) => ({
      ...entry,
      status: normalizeFeedbackStatus(entry.status) || 'pending',
      responseHistory:
        Array.isArray(entry.responseHistory) &&
        (entry.responseHistory.length || !entry.adminResponse)
          ? entry.responseHistory
          : entry.adminResponse
            ? [
                {
                  response: entry.adminResponse,
                  createdAt: entry.respondedAt || entry.updatedAt || entry.createdAt,
                },
              ]
            : [],
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export async function feedbackForAdmin(user) {
  if (!isApprovedAdmin(user)) return []
  const store = await freshStore()
  return (store.feedback || [])
    .map((entry) => ({
      ...entry,
      status: normalizeFeedbackStatus(entry.status) || 'pending',
      responseHistory:
        Array.isArray(entry.responseHistory) &&
        (entry.responseHistory.length || !entry.adminResponse)
          ? entry.responseHistory
          : entry.adminResponse
            ? [
                {
                  response: entry.adminResponse,
                  createdAt: entry.respondedAt || entry.updatedAt || entry.createdAt,
                },
              ]
            : [],
      buyerName: store.users.get(entry.userId)?.name || 'Buyer',
      submitterRole: entry.submitterRole || 'buyer',
      buyerEmail: store.users.get(entry.userId)?.email || '',
      featured: featuredIds(store).includes(entry.id),
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export async function respondToFeedback(user, { feedbackId, response, status }) {
  if (!isApprovedAdmin(user)) return { error: 'Only administrators can respond to feedback.' }
  const normalizedResponse = String(response || '').trim()
  const normalizedStatus = normalizeFeedbackStatus(String(status || ''))
  if (normalizedResponse.length > 5000)
    return { error: 'Responses must be 5,000 characters or fewer.' }
  if (!feedbackStatuses.has(normalizedStatus)) return { error: 'Choose a valid feedback status.' }

  const store = await freshStore()
  const entry = (store.feedback || []).find((item) => item.id === String(feedbackId || ''))
  if (!entry) return { error: 'Feedback submission not found.' }
  const previousResponse = entry.adminResponse || ''
  if (normalizedStatus === 'responded' && !normalizedResponse && !previousResponse) {
    return { error: 'Add a response before marking feedback as responded.' }
  }
  const normalizedHistory =
    Array.isArray(entry.responseHistory) && (entry.responseHistory.length || !previousResponse)
      ? entry.responseHistory
      : previousResponse
        ? [
            {
              response: previousResponse,
              createdAt: entry.respondedAt || entry.updatedAt || entry.createdAt,
            },
          ]
        : []
  const responseChanged = Boolean(normalizedResponse && normalizedResponse !== previousResponse)
  const changed = responseChanged || normalizeFeedbackStatus(entry.status) !== normalizedStatus
  if (responseChanged) {
    normalizedHistory.push({
      response: normalizedResponse,
      createdAt: new Date().toISOString(),
      adminId: user.id,
      adminName: user.name || 'Administrator',
    })
    entry.adminResponse = normalizedResponse
  }
  entry.responseHistory = normalizedHistory
  entry.status = normalizedStatus
  entry.updatedAt = new Date().toISOString()
  if (responseChanged) entry.respondedAt = entry.updatedAt
  await save()
  if (changed) {
    await notify(
      entry.userId,
      `Feedback update: ${entry.subject}`,
      responseChanged
        ? normalizedResponse
        : `Your feedback status is now ${normalizedStatus.replaceAll('-', ' ')}.`,
      entry.submitterRole === 'seller' ? '/seller/feedback' : '/feedback',
    )
  }
  return { ok: true }
}


/* ── Featured feedback shown on the public home page ─────────────────────────
 * Feedback is private by default. An administrator picks which messages to feature;
 * the ids are kept in platform_settings under 'featuredFeedback'. Only the sender's
 * first name and role are shown publicly.
 */
const FEATURED_KEY = 'featuredFeedback'
const FEATURED_LIMIT = 30

function featuredIds(store) {
  const ids = store.settings?.[FEATURED_KEY]
  return Array.isArray(ids) ? ids : []
}

export async function setFeedbackFeatured(user, feedbackId, featured) {
  if (!isApprovedAdmin(user)) return { error: 'Only administrators can feature feedback.' }
  const store = await freshStore()
  const id = String(feedbackId || '')
  if (!(store.feedback || []).some((entry) => entry.id === id)) return { error: 'Feedback submission not found.' }
  const current = featuredIds(store).filter((item) => item !== id)
  if (featured && current.length >= FEATURED_LIMIT) {
    return { error: `You can feature up to ${FEATURED_LIMIT} messages. Remove one first.` }
  }
  store.settings ??= {}
  store.settings[FEATURED_KEY] = featured ? [id, ...current] : current
  await save()
  return { ok: true }
}

function firstName(name) {
  return String(name || '').trim().split(/\s+/)[0] || 'AgriConnect user'
}

/** Featured feedback for the home page, newest featured first. Reads the database directly. */
export async function publicFeedback() {
  const client = supabaseEnv().serviceKey ? getSupabaseAdmin() : null
  if (client) {
    const { data: setting } = await client.from('platform_settings').select('value').eq('key', FEATURED_KEY).maybeSingle()
    const ids = Array.isArray(setting?.value) ? setting.value : []
    if (!ids.length) return []
    const { data: rows, error } = await client
      .from('buyer_feedback')
      .select('id,user_id,submitter_role,category,message,created_at')
      .in('id', ids)
    if (error) return []
    const userIds = [...new Set((rows || []).map((row) => row.user_id))]
    const { data: people } = userIds.length
      ? await client.from('profiles').select('id,name').in('id', userIds)
      : { data: [] }
    const names = new Map((people || []).map((person) => [person.id, person.name]))
    const byId = new Map((rows || []).map((row) => [row.id, row]))
    return ids
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((row) => ({
        id: row.id,
        name: firstName(names.get(row.user_id)),
        role: row.submitter_role === 'seller' ? 'Seller' : 'Buyer',
        category: row.category,
        message: row.message,
        createdAt: row.created_at,
      }))
  }
  const store = await freshStore()
  const entries = new Map((store.feedback || []).map((entry) => [entry.id, entry]))
  return featuredIds(store)
    .map((id) => entries.get(id))
    .filter(Boolean)
    .map((entry) => ({
      id: entry.id,
      name: firstName(store.users.get(entry.userId)?.name),
      role: entry.submitterRole === 'seller' ? 'Seller' : 'Buyer',
      category: entry.category,
      message: entry.message,
      createdAt: entry.createdAt,
    }))
}
