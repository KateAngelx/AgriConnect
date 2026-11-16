'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { currentUser } from '@/server/auth'
import { respondToFeedback, setFeedbackFeatured } from '@/server/feedback'

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

export async function featureFeedbackAction(formData) {
  const user = await currentUser()
  if (!user) redirect('/login')
  const featured = formData.get('featured') === '1'
  const result = await setFeedbackFeatured(user, formData.get('feedbackId'), featured)
  if (result.error) redirect(`/admin/feedback?error=${encodeURIComponent(result.error)}`)
  revalidatePath('/')
  revalidatePath('/admin/feedback')
  redirect(`/admin/feedback?success=${encodeURIComponent(featured ? 'Feedback is now shown on the home page.' : 'Feedback removed from the home page.')}`)
}
