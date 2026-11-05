import { addToCart, getCart, updateCart } from '@/server/cart'
import { currentUser } from '@/server/auth'
import { authHref } from '@/lib/auth-links'
import { isApprovedBuyer } from '@/server/roles'

export async function GET() {
  const user = await currentUser()
  if (!user) {
    return Response.json(
      { error: 'Sign in required.', redirectTo: authHref('login', '/cart') },
      { status: 401 },
    )
  }
  if (!isApprovedBuyer(user)) {
    return Response.json({ error: 'An approved buyer account is required.' }, { status: 403 })
  }
  return Response.json({ cart: await getCart(user.id) })
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}))
  const result = await addToCart(body)
  return Response.json(result, { status: result.redirectTo ? 401 : result.error ? 400 : 200 })
}

export async function PATCH(request) {
  const body = await request.json().catch(() => ({}))
  const result = await updateCart(body)
  return Response.json(result, { status: result.redirectTo ? 401 : result.error ? 400 : 200 })
}
