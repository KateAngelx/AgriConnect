'use server'

import { redirect } from 'next/navigation'
import { currentUser } from '@/server/auth'
import { markAllNotificationsRead, markNotificationRead } from '@/server/notifications'

export async function readNotificationAction(formData) {
  const user = await currentUser()
  if (!user) redirect('/login')
  const result = await markNotificationRead(String(formData.get('id') ?? ''), user.id)
  if (result.error) redirect(`/notifications?error=${encodeURIComponent(result.error)}`)
  redirect('/notifications?success=Notification%20marked%20as%20read.')
}

export async function readAllNotificationsAction() {
  const user = await currentUser()
  if (!user) redirect('/login')
  const result = await markAllNotificationsRead(user.id)
  if (result.error) redirect(`/notifications?error=${encodeURIComponent(result.error)}`)
  redirect('/notifications?success=Notifications%20marked%20as%20read.')
}
