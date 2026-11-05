import { currentUser } from '@/server/auth'
import { isApprovedBuyer } from '@/server/roles'
import { listWishlistState, setWishlistItem } from '@/server/wishlist'
import { authHref } from '@/lib/auth-links'

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  })
}

async function buyerForRequest() {
  const user = await currentUser()
  if (!user) {
    return {
      error: json(
        { error: 'Sign in required.', redirectTo: authHref('login', '/wishlist') },
        401,
      ),
    }
  }
  if (!isApprovedBuyer(user)) return { error: json({ error: 'An approved buyer account is required.' }, 403) }
  return { user }
}

export async function GET() {
  try {
    const buyer = await buyerForRequest()
    if (buyer.error) return buyer.error
    return json({ userId: buyer.user.id, ...(await listWishlistState(buyer.user.id)) })
  } catch (error) {
    console.error('Could not load wishlist:', error)
    return json({ error: 'Could not load your wishlist. Please try again.' }, 500)
  }
}

export async function PUT(request) {
  try {
    const buyer = await buyerForRequest()
    if (buyer.error) return buyer.error
    const body = await request.json()
    const result = await setWishlistItem(buyer.user, body.productId, body.saved)
    return result.error
      ? json({ error: result.error, redirectTo: result.redirectTo }, result.redirectTo ? 401 : 400)
      : json({ userId: buyer.user.id, ...result })
  } catch (error) {
    console.error('Could not update wishlist:', error)
    return json({ error: 'Could not update your wishlist. Please try again.' }, 500)
  }
}
