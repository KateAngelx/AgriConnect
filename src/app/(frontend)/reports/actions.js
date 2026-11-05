'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { authHref } from '@/lib/auth-links'
import { currentUser } from '@/server/auth'
import { submitBuyerReport } from '@/server/reports'

export async function submitBuyerReportAction(formData) {
  const user = await currentUser()
  const reporterRole = String(formData.get('reporterRole') || 'buyer')
  const path = reporterRole === 'seller' ? '/seller/issues' : '/reports'
  if (!user) redirect(authHref('login', path))
  const result = await submitBuyerReport(user, {
    reportType: formData.get('reportType'),
    reporterRole,
    target: formData.get('target'),
    reason: formData.get('reason'),
    description: formData.get('description'),
  })
  if (result.error) redirect(`${path}?error=${encodeURIComponent(result.error)}`)
  revalidatePath(path)
  redirect(`${path}?success=Your report was submitted.`)
}
