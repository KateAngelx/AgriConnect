'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { currentUser } from '@/server/auth'
import { isApprovedAdmin } from '@/server/roles'
import { publishAdminAnnouncement } from '@/server/announcements'

export async function publishSellerAnnouncementAction(formData) {
  const admin = await currentUser()
  if (!admin) redirect('/login')
  if (!isApprovedAdmin(admin)) redirect('/account')

  const result = await publishAdminAnnouncement(admin, {
    title: formData.get('title'),
    message: formData.get('message'),
    audience: formData.get('audience'),
  })
  if (result.error) {
    redirect(`/admin/announcements?error=${encodeURIComponent(result.error)}`)
  }
  revalidatePath('/admin/announcements')
  redirect(`/admin/announcements?success=${encodeURIComponent(`Announcement sent to ${result.recipientCount} approved account${result.recipientCount === 1 ? '' : 's'}.`)}`)
}
