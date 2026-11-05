'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { currentUser } from '@/server/auth'
import { respondToFeedback } from '@/server/feedback'

export async function respondToFeedbackAction(formData) {
  const user = await currentUser()
  if (!user) redirect('/login')
  const result = await respondToFeedback(user, {
    feedbackId: formData.get('feedbackId'),
    response: formData.get('response'),
    status: formData.get('status'),
  })
  if (result.error) redirect(`/admin/feedback?error=${encodeURIComponent(result.error)}`)
  revalidatePath('/feedback')
  revalidatePath('/seller/feedback')
  revalidatePath('/admin/feedback')
  redirect('/admin/feedback?success=Feedback response updated.')
}
