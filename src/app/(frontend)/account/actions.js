'use server'

import { redirect } from 'next/navigation'
import {
  saveDeliveryApplicationDraft,
  saveSellerApplicationDraft,
  submitDeliveryApplication,
  submitSellerApplication,
} from '@/server/applications'
import { currentUser, logoutAccount } from '@/server/auth'
import { isApprovedBuyer } from '@/server/roles'

async function requireBuyer() {
  const user = await currentUser()
  if (!user) redirect('/login')
  if (!isApprovedBuyer(user)) redirect('/')
  return user
}

function sellerFields(formData) {
  return {
    farmName: formData.get('farmName'),
    applicantName: formData.get('applicantName'),
    contactNumber: formData.get('contactNumber'),
    location: formData.get('location'),
    categories: formData.get('categories'),
    description: formData.get('description'),
  }
}

function deliveryFields(formData) {
  return {
    fullName: formData.get('fullName'),
    contactNumber: formData.get('contactNumber'),
    serviceArea: formData.get('serviceArea'),
    experience: formData.get('experience'),
  }
}

export async function applySellerAction(_state, formData) {
  const user = await requireBuyer()
  const intent = String(formData.get('intent') ?? 'submit')
  const fields = sellerFields(formData)
  const result =
    intent === 'draft'
      ? await saveSellerApplicationDraft(user, fields)
      : await submitSellerApplication(user, fields)
  if (result.error) return { error: result.error }
  if (intent === 'draft') return { ok: true, draft: true }
  redirect('/account/become-seller?submitted=1')
}

export async function applyDeliveryAction(_state, formData) {
  const user = await requireBuyer()
  const intent = String(formData.get('intent') ?? 'submit')
  const fields = deliveryFields(formData)
  const result =
    intent === 'draft'
      ? await saveDeliveryApplicationDraft(user, fields)
      : await submitDeliveryApplication(user, fields)
  if (result.error) return { error: result.error }
  if (intent === 'draft') return { ok: true, draft: true }
  redirect('/account/become-delivery?submitted=1')
}

export async function logoutAction() {
  await logoutAccount()
  redirect('/')
}
