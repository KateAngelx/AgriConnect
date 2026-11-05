'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { currentUser } from '@/server/auth'
import { updateBuyerReport } from '@/server/reports'

export async function updateBuyerReportAction(formData) {
  const user = await currentUser()
  if (!user) redirect('/login')
  const result = await updateBuyerReport(user, {
    reportId: formData.get('reportId'),
    response: formData.get('response'),
    administrativeAction: formData.get('administrativeAction'),
    status: formData.get('status'),
  })
  if (result.error) redirect(`/admin/buyer-reports?error=${encodeURIComponent(result.error)}`)
  revalidatePath('/reports')
  revalidatePath('/seller/issues')
  revalidatePath('/admin/buyer-reports')
  redirect('/admin/buyer-reports?success=Buyer report updated.')
}
