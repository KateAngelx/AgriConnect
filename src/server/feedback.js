import { isApprovedAdmin, isApprovedBuyer, isApprovedSeller } from './roles'
import { notify } from './notifications'
import { save } from './sync'
import { readyStore } from './store'

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

  const store = await readyStore()
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
  const store = await readyStore()
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
  const store = await readyStore()
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

  const store = await readyStore()
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
