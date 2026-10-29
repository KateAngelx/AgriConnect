import { notify } from './notifications'
import {
  canApplyForPartnerRole,
  grantRole,
  isApprovedDelivery,
  isApprovedSeller,
  hasRole,
} from './roles'
import { save } from './sync'
import { readyStore } from './store'

const APPLICATION_TYPES = ['seller', 'delivery']
const ACTIVE_STATUSES = new Set(['pending', 'under-review'])
const EDITABLE_STATUSES = new Set(['draft', 'needs-info'])
const REVIEW_STATUSES = ['draft', 'pending', 'under-review', 'approved', 'rejected', 'needs-info']

function cleanText(value, max) {
  return String(value ?? '').trim().slice(0, max)
}

function findApplication(store, id) {
  return store.applications.find((item) => item.id === id) || null
}

export function activeApplicationForUser(store, userId, type) {
  return (
    store.applications.find(
      (item) =>
        item.userId === userId &&
        item.applicationType === type &&
        ACTIVE_STATUSES.has(item.status),
    ) || null
  )
}

function editableApplicationForUser(store, userId, type) {
  return (
    store.applications.find(
      (item) =>
        item.userId === userId &&
        item.applicationType === type &&
        EDITABLE_STATUSES.has(item.status),
    ) || null
  )
}

export async function applicationsForUser(userId) {
  const store = await readyStore()
  return store.applications
    .filter((item) => item.userId === userId)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
}

export async function listRoleApplications() {
  const store = await readyStore()
  return store.applications
    .map((item) => ({
      ...item,
      user: store.users.get(item.userId) || null,
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

function validateSellerPayload(input, { partial = false } = {}) {
  const farmName = cleanText(input.farmName, 80)
  const applicantName = cleanText(input.applicantName, 80)
  const contactNumber = cleanText(input.contactNumber, 30)
  const location = cleanText(input.location, 80)
  const categories = cleanText(input.categories, 200)
  const description = cleanText(input.description, 500)
  if (partial) {
    return { payload: { farmName, applicantName, contactNumber, location, categories, description } }
  }
  if (farmName.length < 2) return { error: 'Enter your farm or shop name.' }
  if (location.length < 2) return { error: 'Enter your farm or shop location.' }
  if (contactNumber.length < 7) return { error: 'Enter a valid contact number.' }
  if (description.length < 10) return { error: 'Add a brief description of your agricultural business.' }
  return { payload: { farmName, applicantName, contactNumber, location, categories, description } }
}

function validateDeliveryPayload(input, { partial = false } = {}) {
  const fullName = cleanText(input.fullName, 80)
  const contactNumber = cleanText(input.contactNumber, 30)
  const serviceArea = cleanText(input.serviceArea, 120)
  const experience = cleanText(input.experience, 500)
  if (partial) {
    return { payload: { fullName, contactNumber, serviceArea, experience } }
  }
  if (fullName.length < 2) return { error: 'Enter your full name.' }
  if (contactNumber.length < 7) return { error: 'Enter a valid contact number.' }
  if (serviceArea.length < 3) return { error: 'Describe the area where you can deliver.' }
  return { payload: { fullName, contactNumber, serviceArea, experience } }
}

export async function saveSellerApplicationDraft(user, input) {
  if (!canApplyForPartnerRole(user, 'seller')) {
    return { error: 'You cannot start a seller application with this account.' }
  }
  const store = await readyStore()
  if (activeApplicationForUser(store, user.id, 'seller')) {
    return { error: 'You already have a seller application under review.' }
  }
  const validated = validateSellerPayload(input, { partial: true })
  if (validated.error) return validated
  const existing = editableApplicationForUser(store, user.id, 'seller')
  const now = new Date().toISOString()
  if (existing) {
    existing.payload = { ...existing.payload, ...validated.payload }
    existing.updatedAt = now
    existing.status = existing.status === 'needs-info' ? 'needs-info' : 'draft'
  } else {
    store.applications.push({
      id: crypto.randomUUID(),
      userId: user.id,
      applicationType: 'seller',
      status: 'draft',
      payload: validated.payload,
      adminNote: '',
      createdAt: now,
      updatedAt: now,
    })
  }
  await save()
  return { ok: true }
}

export async function submitSellerApplication(user, input) {
  if (!canApplyForPartnerRole(user, 'seller')) {
    return { error: 'You cannot submit a seller application with this account.' }
  }
  const store = await readyStore()
  if (activeApplicationForUser(store, user.id, 'seller')) {
    return { error: 'You already have an active seller application under review.' }
  }
  const validated = validateSellerPayload(input)
  if (validated.error) return validated
  const { payload } = validated
  const applicantName = payload.applicantName || user.name
  const editable = editableApplicationForUser(store, user.id, 'seller')
  const now = new Date().toISOString()
  const application = editable || {
    id: crypto.randomUUID(),
    userId: user.id,
    applicationType: 'seller',
    adminNote: '',
    createdAt: now,
  }
  application.status = 'pending'
  application.payload = payload
  application.updatedAt = now
  if (!editable) store.applications.push(application)
  await notifyAdmins(store, 'New seller application', `${applicantName} applied to sell on AgriConnect.`, '/admin/applications')
  await notify(
    user.id,
    'Seller application received',
    'Your application is pending review. We will notify you when an administrator decides.',
    '/account/become-seller',
  )
  await save()
  return { ok: true, applicationId: application.id }
}

export async function saveDeliveryApplicationDraft(user, input) {
  if (!canApplyForPartnerRole(user, 'delivery')) {
    return { error: 'You cannot start a delivery application with this account.' }
  }
  const store = await readyStore()
  if (activeApplicationForUser(store, user.id, 'delivery')) {
    return { error: 'You already have a delivery application under review.' }
  }
  const validated = validateDeliveryPayload(input, { partial: true })
  if (validated.error) return validated
  const existing = editableApplicationForUser(store, user.id, 'delivery')
  const now = new Date().toISOString()
  if (existing) {
    existing.payload = { ...existing.payload, ...validated.payload }
    existing.updatedAt = now
    existing.status = existing.status === 'needs-info' ? 'needs-info' : 'draft'
  } else {
    store.applications.push({
      id: crypto.randomUUID(),
      userId: user.id,
      applicationType: 'delivery',
      status: 'draft',
      payload: validated.payload,
      adminNote: '',
      createdAt: now,
      updatedAt: now,
    })
  }
  await save()
  return { ok: true }
}

export async function submitDeliveryApplication(user, input) {
  if (!canApplyForPartnerRole(user, 'delivery')) {
    return { error: 'You cannot submit a delivery application with this account.' }
  }
  const store = await readyStore()
  if (activeApplicationForUser(store, user.id, 'delivery')) {
    return { error: 'You already have an active delivery application under review.' }
  }
  const validated = validateDeliveryPayload(input)
  if (validated.error) return validated
  const { payload } = validated
  const fullName = payload.fullName || user.name
  const editable = editableApplicationForUser(store, user.id, 'delivery')
  const now = new Date().toISOString()
  const application = editable || {
    id: crypto.randomUUID(),
    userId: user.id,
    applicationType: 'delivery',
    adminNote: '',
    createdAt: now,
  }
  application.status = 'pending'
  application.payload = payload
  application.updatedAt = now
  if (!editable) store.applications.push(application)
  await notifyAdmins(store, 'New delivery application', `${fullName} applied to deliver on AgriConnect.`, '/admin/applications')
  await notify(
    user.id,
    'Delivery application received',
    'Your application is pending review. We will notify you when an administrator decides.',
    '/account/become-delivery',
  )
  await save()
  return { ok: true, applicationId: application.id }
}

async function notifyAdmins(store, title, body, href) {
  for (const admin of store.users.values()) {
    if (admin.role === 'admin' && admin.status === 'approved') {
      await notify(admin.id, title, body, href)
    }
  }
}

export async function reviewRoleApplication(actor, applicationId, decision, adminNote) {
  if (actor.role !== 'admin' || actor.status !== 'approved') {
    return { error: 'Only an approved administrator can review applications.' }
  }
  const normalized = String(decision ?? '').toLowerCase()
  if (!['approved', 'rejected', 'under-review', 'needs-info'].includes(normalized)) {
    return { error: 'Choose approve, reject, request information, or mark under review.' }
  }
  const store = await readyStore()
  const application = findApplication(store, applicationId)
  if (!application) return { error: 'Application not found.' }
  if (!ACTIVE_STATUSES.has(application.status) && application.status !== 'under-review') {
    if (!(application.status === 'needs-info' && normalized === 'under-review')) {
      return { error: 'This application has already been decided.' }
    }
  }

  const applicant = store.users.get(application.userId)
  if (!applicant) return { error: 'Applicant account not found.' }

  const note = cleanText(adminNote, 500)
  application.updatedAt = new Date().toISOString()
  application.adminNote = note

  if (normalized === 'under-review') {
    application.status = 'under-review'
    await notify(
      applicant.id,
      'Application under review',
      note || 'An administrator is reviewing your application.',
      application.applicationType === 'seller' ? '/account/become-seller' : '/account/become-delivery',
    )
    await save()
    return { ok: true }
  }

  if (normalized === 'needs-info') {
    if (!note) return { error: 'Provide a reason or instructions when requesting additional information.' }
    application.status = 'needs-info'
    await notify(
      applicant.id,
      'Additional information required',
      note,
      application.applicationType === 'seller' ? '/account/become-seller' : '/account/become-delivery',
    )
    await save()
    return { ok: true }
  }

  if (normalized === 'rejected') {
    application.status = 'rejected'
    await notify(
      applicant.id,
      'Application not approved',
      note || 'Your application was not approved at this time. You may submit a new application later.',
      '/#partner-programs',
    )
    await save()
    return { ok: true }
  }

  if (application.applicationType === 'seller') {
    if (isApprovedSeller({ ...applicant, roles: applicant.roles })) {
      return { error: 'This account is already an approved seller.' }
    }
    const sellerId = crypto.randomUUID()
    grantRole(applicant, 'seller')
    applicant.status = 'approved'
    applicant.sellerId = sellerId
    if (application.payload.contactNumber) {
      applicant.contactNumber = application.payload.contactNumber
    }
    store.sellers.push({
      id: sellerId,
      ownerId: applicant.id,
      farmName: application.payload.farmName,
      location: application.payload.location,
      status: 'approved',
      description: application.payload.description,
      image: { url: '', alt: application.payload.farmName },
    })
  } else if (application.applicationType === 'delivery') {
    if (isApprovedDelivery({ ...applicant, roles: applicant.roles })) {
      return { error: 'This account is already an approved delivery partner.' }
    }
    grantRole(applicant, 'delivery')
    applicant.status = 'approved'
    applicant.serviceArea = application.payload.serviceArea
  } else {
    return { error: 'Unknown application type.' }
  }

  application.status = 'approved'
  await notify(
    applicant.id,
    'Application approved',
    note ||
      (application.applicationType === 'seller'
        ? 'You can now access the seller dashboard and publish products.'
        : 'You can now access the delivery dashboard and accept assignments.'),
    application.applicationType === 'seller' ? '/seller/dashboard' : '/delivery/dashboard',
  )
  await save()
  return { ok: true }
}

export function applicationStatusLabel(status) {
  if (!REVIEW_STATUSES.includes(status)) return status
  return status.replaceAll('-', ' ')
}
