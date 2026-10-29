import { currentUser } from './auth'
import { getProduct } from './catalog'
import { isApprovedBuyer } from './roles'
import { save } from './sync'
import { readyStore } from './store'

async function requireBuyer() {
  const user = await currentUser()
  if (!user) return { error: 'Sign in to use your cart.', redirectTo: '/login' }
  if (!isApprovedBuyer(user)) {
    return { error: 'Sign in with an approved account to use your cart.' }
  }
  return { user }
}

function presentCart(store, cart) {
  if (!cart) return null
  return {
    ...cart,
    items: cart.items.map((item) => ({
      ...item,
      product: store.products.find((product) => product.id === item.productId) ?? item.productId,
    })),
  }
}

export async function getCart(userId) {
  const store = await readyStore()
  const buyerId = userId ?? (await currentUser())?.id
  if (!buyerId) return null
  return presentCart(store, store.carts.get(buyerId) ?? null)
}

export async function addToCart(input) {
  const buyer = await requireBuyer()
  if (buyer.error) return buyer
  const productID = String(input.productID ?? '')
  const quantity = Math.max(1, Math.floor(Number(input.quantity) || 1))
  if (!productID) return { error: 'Choose a product.' }
  const product = await getProduct(productID)
  if (!product || product.status !== 'active') return { error: 'That product is not available.' }
  if (product.stock < quantity) return { error: 'The requested quantity is not available.' }
  const store = await readyStore()
  const cart = store.carts.get(buyer.user.id) ?? {
    id: crypto.randomUUID(),
    buyer: buyer.user.id,
    items: [],
  }
  const existing = cart.items.find((item) => item.productId === product.id)
  const nextQuantity = (existing?.quantity ?? 0) + quantity
  if (nextQuantity > product.stock) return { error: 'The requested quantity exceeds available stock.' }
  if (existing) existing.quantity = nextQuantity
  else cart.items.push({ id: crypto.randomUUID(), productId: product.id, quantity })
  store.carts.set(buyer.user.id, cart)
  await save()
  return { cart: presentCart(store, cart) }
}

export async function updateCart(input) {
  const buyer = await requireBuyer()
  if (buyer.error) return buyer
  const store = await readyStore()
  const cart = store.carts.get(buyer.user.id)
  const item = cart?.items.find((entry) => entry.id === String(input.itemID ?? ''))
  if (!cart || cart.id !== String(input.cartID ?? '') || !item) return { error: 'Cart item not found.' }
  const quantity = Math.max(0, Math.floor(Number(input.quantity) || 0))
  const product = await getProduct(item.productId)
  if (!product) return { error: 'Cart item not found.' }
  if (quantity > product.stock) return { error: 'The requested quantity exceeds available stock.' }
  if (quantity === 0) cart.items = cart.items.filter((entry) => entry.id !== item.id)
  else item.quantity = quantity
  await save()
  return { cart: presentCart(store, cart) }
}
