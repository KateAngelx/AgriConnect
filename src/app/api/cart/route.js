import { addToCart, buyNow, getCart, updateCart } from '@/server/cart'
import { currentUser } from '@/server/auth'
import { authHref } from '@/lib/auth-links'
import { isApprovedBuyer } from '@/server/roles'

export async function GET() {
  try {
    const user = await currentUser()
    if (!user) {
      return Response.json(
        { error: 'Sign in required.', redirectTo: authHref('login', '/cart') },
        { status: 401, headers: { 'Cache-Control': 'no-store, max-age=0' } },
      )
    }
    if (!isApprovedBuyer(user)) {
      return Response.json(
        { error: 'An approved buyer account is required.' },
        { status: 403, headers: { 'Cache-Control': 'no-store, max-age=0' } },
      )
    }
    return Response.json(
      { userId: user.id, cart: await getCart(user.id) },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    )
  } catch (error) {
    console.error('Could not load cart:', error)
    return Response.json({ error: 'Could not load your cart. Please try again.' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const result = body.replace ? await buyNow(body) : await addToCart(body)
    return Response.json(result, {
      status: result.redirectTo ? 401 : result.error ? 400 : 200,
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    })
  } catch (error) {
    console.error('Could not update cart:', error)
    return Response.json({ error: 'Could not update your cart. Please try again.' }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json()
    const result = await updateCart(body)
    return Response.json(result, {
      status: result.redirectTo ? 401 : result.error ? 400 : 200,
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    })
  } catch (error) {
    console.error('Could not update cart:', error)
    return Response.json({ error: 'Could not update your cart. Please try again.' }, { status: 500 })
  }
}
