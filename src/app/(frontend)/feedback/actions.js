'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { authHref } from '@/lib/auth-links'
import { currentUser } from '@/server/auth'
import { isApprovedSeller } from '@/server/roles'
import { submitFeedback } from '@/server/feedback'

export async function submitFeedbackAction(formData) {
  const user = await currentUser()
  const sellerWorkspace = Boolean(user && formData.get('submitterRole') === 'seller' && isApprovedSeller(user))
  const path = sellerWorkspace ? '/seller/feedback' : '/feedback'
  if (!user) redirect(authHref('login', path))
  const result = await submitFeedback(user, {
    subject: formData.get('subject'),
    category: formData.get('category'),
    message: formData.get('message'),
    submitterRole: sellerWorkspace ? 'seller' : 'buyer',
  })
  if (result.error) redirect(`${path}?error=${encodeURIComponent(result.error)}`)
  revalidatePath(path)
  redirect(`${path}?success=Your feedback was submitted.`)
}
