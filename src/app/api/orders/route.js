import { listOrders, placeOrder } from '@/server/orders'
import { currentUser } from '@/server/auth'
import { authHref } from '@/lib/auth-links'
import { isApprovedBuyer } from '@/server/roles'

export async function GET(request) {
  const user = await currentUser()
  if (!user) {
    return Response.json(
      { error: 'Sign in required.', redirectTo: authHref('login', '/buyer/orders') },
      { status: 401 },
    )
  }
  if (!isApprovedBuyer(user)) {
    return Response.json({ error: 'An approved buyer account is required.' }, { status: 403 })
  }
  const page = new URL(request.url).searchParams.get('page') || 1
  return Response.json(await listOrders(user.id, page))
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}))
  const result = await placeOrder(body)
  return Response.json(result, { status: result.redirectTo ? 401 : result.error ? 400 : 201 })
}
