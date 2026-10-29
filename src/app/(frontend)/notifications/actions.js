'use server'

import { redirect } from 'next/navigation'
import { currentUser } from '@/server/auth'
import { markAllNotificationsRead, markNotificationRead } from '@/server/notifications'

export async function readNotificationAction(formData) {
  const user = await currentUser()
  if (!user) redirect('/login')
  await markNotificationRead(String(formData.get('id') ?? ''), user.id)
  redirect('/notifications')
}

export async function readAllNotificationsAction() {
  const user = await currentUser()
  if (!user) redirect('/login')
  await markAllNotificationsRead(user.id)
  redirect('/notifications')
}
