import { currentUser } from '@/server/auth'
import { readyStore } from '@/server/store'
import { save } from '@/server/sync'

export async function POST(request) {
  const user = await currentUser()
  if (!user) return Response.json({ error: 'Login required.' }, { status: 401 })
  const subscription = await request.json()
  if (!subscription?.endpoint) return Response.json({ error: 'Invalid push subscription.' }, { status: 400 })

  const store = await readyStore()
  store.pushSubscriptions = (store.pushSubscriptions || []).filter(
    (item) => item.userId !== user.id || item.subscription.endpoint !== subscription.endpoint,
  )
  store.pushSubscriptions.push({ userId: user.id, subscription, createdAt: new Date().toISOString() })
  await save()
  return Response.json({ ok: true })
}
