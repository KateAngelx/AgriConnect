import { currentUser } from '@/server/auth'
import { readyStore } from '@/server/store'
import { save } from '@/server/sync'

export async function GET(request) {
  const user = await currentUser()
  if (!user) return Response.json({ error: 'Login required.' }, { status: 401 })

  const deliveryId = new URL(request.url).searchParams.get('deliveryId')
  const store = await readyStore()
  const delivery = store.deliveries.find((item) => item.id === deliveryId)
  if (!delivery) return Response.json({ error: 'Delivery not found.' }, { status: 404 })

  const order = store.orders.get(delivery.orderId)
  const allowed = delivery.courierId === user.id || order?.buyer === user.id
  if (!allowed) return Response.json({ error: 'Access denied.' }, { status: 403 })

  return Response.json({
    lat: delivery.courierLat ?? null,
    lng: delivery.courierLng ?? null,
    updatedAt: delivery.courierLocationAt ?? null,
  })
}

export async function POST(request) {
  const user = await currentUser()
  if (!user) return Response.json({ error: 'Login required.' }, { status: 401 })

  const { deliveryId, lat, lng } = await request.json()
  const store = await readyStore()
  const delivery = store.deliveries.find((item) => item.id === deliveryId)
  if (!delivery || delivery.courierId !== user.id) {
    return Response.json({ error: 'This delivery is not assigned to you.' }, { status: 403 })
  }

  delivery.courierLat = Number(lat)
  delivery.courierLng = Number(lng)
  delivery.courierLocationAt = new Date().toISOString()
  await save()
  return Response.json({ ok: true })
}
