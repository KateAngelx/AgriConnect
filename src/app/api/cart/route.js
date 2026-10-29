import { addToCart, getCart, updateCart } from '@/server/cart'
import { currentUser } from '@/server/auth'

export async function GET() {
  const user = await currentUser()
  if (!user) return Response.json({ error: 'Sign in required.' }, { status: 401 })
  return Response.json({ cart: await getCart(user.id) })
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}))
  const result = await addToCart(body)
  return Response.json(result, { status: result.error ? 400 : 200 })
}

export async function PATCH(request) {
  const body = await request.json().catch(() => ({}))
  const result = await updateCart(body)
  return Response.json(result, { status: result.error ? 400 : 200 })
}
