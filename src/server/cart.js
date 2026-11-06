import { currentUser } from './auth'
import { getProduct } from './catalog'
import { isApprovedBuyer } from './roles'
import { mutateBuyerCart, readBuyerCart, saveCart } from './sync'
import { getStore, readyStore } from './store'
import { getSupabaseAdmin, supabaseEnv } from '@/lib/supabase'

async function requireBuyer(nextPath = '/cart') {
  const user = await currentUser()
  if (!user) {
    const { authHref } = await import('@/lib/auth-links')
    return { error: 'Sign in to use your cart.', redirectTo: authHref('login', nextPath) }
  }
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
      product: store.products.find((product) => product.id === item.productId) ?? {
        id: item.productId,
        name: 'Unavailable product',
        status: 'unavailable',
        stock: 0,
        price: 0,
        unit: 'item',
        seller: null,
      },
    })),
  }
}

async function presentDatabaseCart(client, cart) {
  const productIds = [...new Set((cart?.items || []).map((item) => item.productId).filter(Boolean))]
  if (!productIds.length) return { ...cart, items: [] }
  const { data: productRows, error: productError } = await client
    .from('products')
    .select('id,name,price,unit,stock,location,status,pickup,delivery,seller_id,images')
    .in('id', productIds)
  if (productError) throw new Error(`Could not load cart products: ${productError.message}`)
  const sellerIds = [...new Set((productRows || []).map((product) => product.seller_id).filter(Boolean))]
  const { data: sellerRows, error: sellerError } = sellerIds.length
    ? await client.from('sellers').select('id,farm_name,status').in('id', sellerIds)
    : { data: [], error: null }
  if (sellerError) throw new Error(`Could not load cart sellers: ${sellerError.message}`)
  const sellers = new Map((sellerRows || []).map((seller) => [seller.id, seller]))
  const products = new Map((productRows || []).map((product) => [
    product.id,
    {
      id: product.id,
      name: product.name,
      price: Number(product.price || 0),
      unit: product.unit || 'item',
      stock: Number(product.stock || 0),
      location: product.location || '',
      status: product.status,
      pickup: Boolean(product.pickup),
      delivery: Boolean(product.delivery),
      images: product.images || [],
      seller: sellers.has(product.seller_id)
        ? {
            id: product.seller_id,
            farmName: sellers.get(product.seller_id).farm_name,
            status: sellers.get(product.seller_id).status,
          }
        : null,
    },
  ]))
  return {
    ...cart,
    items: cart.items.map((item) => ({
      ...item,
      product: products.get(item.productId) || {
        id: item.productId,
        name: 'Unavailable product',
        status: 'unavailable',
        stock: 0,
        price: 0,
        unit: 'item',
        seller: null,
      },
    })),
  }
}

export async function getCart(userId) {
  const buyerId = userId ?? (await currentUser())?.id
  if (!buyerId) return null
  const client = supabaseEnv().serviceKey ? getSupabaseAdmin() : null
  if (client) {
    const cart = await readBuyerCart(buyerId)
    const store = getStore()
    if (cart) store.carts.set(buyerId, cart)
    else store.carts.delete(buyerId)
    return cart ? presentDatabaseCart(client, cart) : null
  }
  const store = await readyStore()
  const persistedCart = await readBuyerCart(buyerId)
  if (persistedCart !== undefined) {
    if (persistedCart) store.carts.set(buyerId, persistedCart)
    else store.carts.delete(buyerId)
  }
  return presentCart(store, store.carts.get(buyerId) ?? null)
}

export async function addToCart(input) {
  const productID = String(input.productID ?? '')
  const buyer = await requireBuyer(productID ? `/products/${encodeURIComponent(productID)}` : '/products')
  if (buyer.error) return buyer
  const quantity = Number(input.quantity ?? 1)
  if (!productID) return { error: 'Choose a product.' }
  if (!Number.isInteger(quantity) || quantity < 1) return { error: 'Enter a valid quantity.' }
  const persistedCart = await mutateBuyerCart({
    buyerId: buyer.user.id,
    operation: 'add',
    productId: productID,
    quantity,
  })
  if (persistedCart) {
    return { cart: await getCart(buyer.user.id) }
  }
  const store = await readyStore()
  const product = await getProduct(productID)
  if (!product || product.status !== 'active') return { error: 'That product is not available.' }
  if (product.stock < quantity) return { error: 'The requested quantity is not available.' }
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
  await saveCart(cart)
  return { cart: presentCart(store, cart) }
}

export async function updateCart(input) {
  const buyer = await requireBuyer()
  if (buyer.error) return buyer
  const cart = await getCart(buyer.user.id)
  const item = cart?.items.find((entry) => entry.id === String(input.itemID ?? ''))
  if (!cart || cart.id !== String(input.cartID ?? '') || !item) return { error: 'Cart item not found.' }
  const quantity = Number(input.quantity)
  if (!Number.isInteger(quantity) || quantity < 0) return { error: 'Enter a valid quantity.' }
  const persistedCart = await mutateBuyerCart({
    buyerId: buyer.user.id,
    operation: 'set',
    cartId: cart.id,
    itemId: item.id,
    quantity,
  })
  if (persistedCart) {
    return { cart: await getCart(buyer.user.id) }
  }
  const store = await readyStore()
  const memoryCart = store.carts.get(buyer.user.id)
  const memoryItem = memoryCart?.items.find((entry) => entry.id === item.id)
  if (!memoryCart || !memoryItem) return { error: 'Cart item not found.' }
  if (quantity === 0) {
    memoryCart.items = memoryCart.items.filter((entry) => entry.id !== item.id)
    await saveCart(memoryCart)
    return { cart: presentCart(store, memoryCart) }
  }
  const product = await getProduct(memoryItem.productId)
  if (!product) return { error: 'Cart item not found.' }
  if (quantity > product.stock) return { error: 'The requested quantity exceeds available stock.' }
  memoryItem.quantity = quantity
  await saveCart(memoryCart)
  return { cart: presentCart(store, memoryCart) }
}

export async function buyNow(input) {
  const productID = String(input.productID ?? '')
  const buyer = await requireBuyer(productID ? `/products/${encodeURIComponent(productID)}` : '/products')
  if (buyer.error) return buyer
  const quantity = Number(input.quantity ?? 1)
  if (!productID) return { error: 'Choose a product.' }
  if (!Number.isInteger(quantity) || quantity < 1) return { error: 'Enter a valid quantity.' }
  const persistedCart = await mutateBuyerCart({
    buyerId: buyer.user.id,
    operation: 'replace',
    productId: productID,
    quantity,
  })
  if (persistedCart) {
    return { cart: await getCart(buyer.user.id) }
  }
  const store = await readyStore()
  const product = await getProduct(productID)
  if (!product || product.status !== 'active') return { error: 'That product is not available.' }
  if (quantity > product.stock) return { error: 'The requested quantity exceeds available stock.' }
  const existingCart = store.carts.get(buyer.user.id)
  const cart = {
    id: existingCart?.id ?? crypto.randomUUID(),
    buyer: buyer.user.id,
    items: [{ id: crypto.randomUUID(), productId: product.id, quantity }],
  }
  store.carts.set(buyer.user.id, cart)
  await saveCart(cart)
  return { cart: presentCart(store, cart) }
}
