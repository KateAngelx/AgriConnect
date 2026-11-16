import { currentUser } from '@/server/auth'
import { readCourierLocation, saveCourierLocation } from '@/server/courier-location'

export async function GET(request) {
  const user = await currentUser()
  if (!user) return Response.json({ error: 'Login required.' }, { status: 401 })
  const deliveryId = new URL(request.url).searchParams.get('deliveryId')
  const result = await readCourierLocation(user, deliveryId)
  if (result.error) return Response.json({ error: result.error }, { status: result.status || 400 })
  return Response.json(result, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request) {
  const user = await currentUser()
  if (!user) return Response.json({ error: 'Login required.' }, { status: 401 })
  let body = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }
  const result = await saveCourierLocation(user, body.deliveryId, body.lat, body.lng)
  if (result.error) return Response.json({ error: result.error }, { status: result.status || 400 })
  return Response.json(result)
}
