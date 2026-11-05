'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

const MarketplaceStateContext = createContext(null)

function announce(tone, text) {
  window.dispatchEvent(new CustomEvent('agriconnect:feedback', { detail: { tone, text } }))
}

async function readResponse(response) {
  let data = {}
  try {
    data = await response.json()
  } catch {
    data = {}
  }
  if (!response.ok) throw new Error(data.error || 'The update could not be completed.')
  return data
}

async function readBuyerStateResponse(path, signal) {
  const response = await fetch(path, {
    cache: 'no-store',
    credentials: 'same-origin',
    signal,
  })
  let data = {}
  try {
    data = await response.json()
  } catch {
    data = {}
  }
  if (!response.ok) {
    if (response.status === 401 && data.redirectTo) window.location.assign(data.redirectTo)
    throw new Error(data.error || 'Could not load your saved shopping data.')
  }
  return data
}

export function MarketplaceStateProvider({
  userId,
  initialCart = null,
  initialWishlist = [],
  initialWishlistRevision = 0,
  children,
}) {
  const [state, setState] = useState(() => ({
    userId,
    cart: initialCart,
    wishlist: initialWishlist,
    cartBusy: false,
    wishlistBusy: false,
    cartLoading: Boolean(userId && !initialCart),
    wishlistLoading: Boolean(userId && !initialCart),
    cartError: '',
    wishlistError: '',
  }))
  const cartRef = useRef(userId === state.userId ? initialCart : null)
  const wishlistRef = useRef(userId === state.userId ? initialWishlist : [])
  const cartRevision = useRef(Number(initialCart?.revision || 0))
  const wishlistRevision = useRef(Number(initialWishlistRevision || 0))
  const cartBusy = useRef(false)
  const wishlistBusy = useRef(false)
  const channel = useRef(null)
  const updateSequence = useRef({ cart: 0, wishlist: 0 })
  const [cartReloadVersion, setCartReloadVersion] = useState(0)
  const [wishlistReloadVersion, setWishlistReloadVersion] = useState(0)

  useEffect(() => {
    if (state.userId === userId) return
    cartRef.current = initialCart
    wishlistRef.current = initialWishlist
    cartRevision.current = Number(initialCart?.revision || 0)
    wishlistRevision.current = Number(initialWishlistRevision || 0)
    cartBusy.current = false
    wishlistBusy.current = false
    setState({
      userId,
      cart: initialCart,
      wishlist: initialWishlist,
      cartBusy: false,
      wishlistBusy: false,
      cartLoading: Boolean(userId && !initialCart),
      wishlistLoading: Boolean(userId && !initialCart),
      cartError: '',
      wishlistError: '',
    })
  }, [userId, state.userId, initialCart, initialWishlist, initialWishlistRevision])

  const publish = useCallback((kind, value, revision) => {
    if (!userId) return
    const nextRevision = Number(revision || 0)
    if (kind === 'cart') {
      if (nextRevision < cartRevision.current) return false
      cartRevision.current = nextRevision
      cartRef.current = value
      setState((previous) =>
        previous.userId === userId ? { ...previous, cart: value, cartError: '' } : previous,
      )
    } else {
      if (nextRevision < wishlistRevision.current) return false
      wishlistRevision.current = nextRevision
      wishlistRef.current = value
      setState((previous) =>
        previous.userId === userId ? { ...previous, wishlist: value, wishlistError: '' } : previous,
      )
    }
    updateSequence.current[kind] = Math.max(
      Date.now() * 1000 + Math.floor(Math.random() * 1000),
      updateSequence.current[kind] + 1,
    )
    channel.current?.postMessage({
      userId,
      kind,
      revision: nextRevision,
      sequence: updateSequence.current[kind],
      value,
    })
    return true
  }, [userId])

  useEffect(() => {
    if (!userId || state.userId !== userId) return
    const serverCartRevision = Number(initialCart?.revision || 0)
    if (!cartBusy.current && serverCartRevision > cartRevision.current) {
      publish('cart', initialCart, serverCartRevision)
    }
    const serverWishlistRevision = Number(initialWishlistRevision || 0)
    if (!wishlistBusy.current && serverWishlistRevision > wishlistRevision.current) {
      publish('wishlist', initialWishlist, serverWishlistRevision)
    }
  }, [
    userId,
    state.userId,
    initialCart,
    initialWishlist,
    initialWishlistRevision,
    publish,
  ])

  useEffect(() => {
    if (!userId || state.userId !== userId) return
    let active = true
    const controller = new AbortController()
    setState((previous) =>
      previous.userId === userId
        ? { ...previous, cartLoading: true, cartError: '' }
        : previous,
    )

    async function loadCart() {
      try {
        const data = await readBuyerStateResponse('/api/cart', controller.signal)
        if (
          data.userId !== userId ||
          (data.cart &&
            (data.cart.buyer !== userId || !Array.isArray(data.cart.items)))
        ) {
          throw new Error('Could not verify cart ownership. Please sign in again.')
        }
        if (!active) return
        if (!cartBusy.current) publish('cart', data.cart, data.cart?.revision || 0)
      } catch (error) {
        if (!active || error?.name === 'AbortError') return
        const message = error instanceof Error ? error.message : 'Could not load your cart.'
        setState((previous) =>
          previous.userId === userId ? { ...previous, cartError: message } : previous,
        )
        announce('error', message)
      } finally {
        if (active) {
          setState((previous) =>
            previous.userId === userId ? { ...previous, cartLoading: false } : previous,
          )
        }
      }
    }

    void loadCart()
    return () => {
      active = false
      controller.abort()
    }
  }, [userId, state.userId, cartReloadVersion, publish])

  useEffect(() => {
    if (!userId || state.userId !== userId) return
    let active = true
    const controller = new AbortController()
    setState((previous) =>
      previous.userId === userId
        ? { ...previous, wishlistLoading: true, wishlistError: '' }
        : previous,
    )

    async function loadWishlist() {
      try {
        const data = await readBuyerStateResponse('/api/wishlist', controller.signal)
        if (data.userId !== userId || !Array.isArray(data.items)) {
          throw new Error('Could not verify wishlist ownership. Please sign in again.')
        }
        if (!active) return
        if (!wishlistBusy.current) publish('wishlist', data.items, data.revision || 0)
      } catch (error) {
        if (!active || error?.name === 'AbortError') return
        const message = error instanceof Error ? error.message : 'Could not load your wishlist.'
        setState((previous) =>
          previous.userId === userId ? { ...previous, wishlistError: message } : previous,
        )
        announce('error', message)
      } finally {
        if (active) {
          setState((previous) =>
            previous.userId === userId ? { ...previous, wishlistLoading: false } : previous,
          )
        }
      }
    }

    void loadWishlist()
    return () => {
      active = false
      controller.abort()
    }
  }, [userId, state.userId, wishlistReloadVersion, publish])

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined' || !userId) return
    const connection = new BroadcastChannel('agriconnect-buyer-state')
    channel.current = connection
    connection.onmessage = ({ data }) => {
      if (data?.userId !== userId) return
      const revision = Number(data.revision || 0)
      const sequence = Number(data.sequence || 0)
      if (
        data.kind === 'cart' &&
        revision >= cartRevision.current &&
        (revision > cartRevision.current || sequence > updateSequence.current.cart)
      ) {
        cartRevision.current = revision
        updateSequence.current.cart = sequence
        cartRef.current = data.value
        setState((previous) =>
          previous.userId === userId ? { ...previous, cart: data.value, cartError: '' } : previous,
        )
      }
      if (
        data.kind === 'wishlist' &&
        revision >= wishlistRevision.current &&
        (revision > wishlistRevision.current || sequence > updateSequence.current.wishlist)
      ) {
        wishlistRevision.current = revision
        updateSequence.current.wishlist = sequence
        wishlistRef.current = data.value
        setState((previous) =>
          previous.userId === userId ? { ...previous, wishlist: data.value, wishlistError: '' } : previous,
        )
      }
    }
    return () => {
      connection.close()
      if (channel.current === connection) channel.current = null
    }
  }, [userId])

  const refreshCart = useCallback(() => {
    setCartReloadVersion((version) => version + 1)
  }, [])

  const refreshWishlist = useCallback(() => {
    setWishlistReloadVersion((version) => version + 1)
  }, [])

  const addToCart = useCallback(async (product, quantity = 1, replace = false) => {
    if (!userId) return { error: 'Sign in with an approved buyer account to use your cart.' }
    if (cartBusy.current) return { error: 'A cart update is already processing.' }
    const amount = Math.floor(Number(quantity))
    if (!Number.isInteger(amount) || amount < 1) return { error: 'Enter a valid quantity.' }
    cartBusy.current = true
    setState((previous) => ({ ...previous, cartBusy: true }))
    const previousCart = cartRef.current
    const item = previousCart?.items?.find((entry) => entry.productId === product.id)
    const optimisticItems = replace
      ? [{ id: `pending-${product.id}`, productId: product.id, quantity: amount, product }]
      : item
        ? previousCart.items.map((entry) =>
            entry.productId === product.id
              ? { ...entry, quantity: entry.quantity + amount, product }
              : entry,
          )
        : [
            ...(previousCart?.items || []),
            { id: `pending-${product.id}`, productId: product.id, quantity: amount, product },
          ]
    const optimisticCart = {
      id: previousCart?.id || `pending-${userId}`,
      buyer: userId,
      items: optimisticItems,
      revision: cartRevision.current,
    }
    cartRef.current = optimisticCart
    setState((previous) =>
      previous.userId === userId ? { ...previous, cart: optimisticCart } : previous,
    )
    try {
      const data = await readResponse(
        await fetch('/api/cart', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productID: product.id, quantity: amount, replace }),
        }),
      )
      if (data.cart?.buyer !== userId) throw new Error('The cart belongs to another account. Please sign in again.')
      publish('cart', data.cart, data.cart?.revision || 0)
      announce('success', replace ? 'Ready for checkout.' : 'Added to your cart.')
      return { ok: true, cart: data.cart }
    } catch (error) {
      publish('cart', previousCart, cartRevision.current)
      announce('error', error.message || 'Could not update your cart.')
      return { error: error.message || 'Could not update your cart.' }
    } finally {
      cartBusy.current = false
      setState((previous) => ({ ...previous, cartBusy: false }))
    }
  }, [publish, userId])

  const updateCart = useCallback(async (itemId, quantity) => {
    if (!userId) return { error: 'Sign in with an approved buyer account to use your cart.' }
    if (cartBusy.current) return { error: 'A cart update is already processing.' }
    const currentCart = cartRef.current
    const currentItem = currentCart?.items?.find((item) => item.id === itemId)
    if (!currentCart || !currentItem) return { error: 'Cart item not found.' }
    const amount = Math.floor(Number(quantity))
    if (!Number.isInteger(amount) || amount < 0) return { error: 'Enter a valid quantity.' }

    cartBusy.current = true
    setState((previous) => ({ ...previous, cartBusy: true }))
    const previousCart = currentCart
    const optimisticCart = {
      ...currentCart,
      items: amount === 0
        ? currentCart.items.filter((item) => item.id !== itemId)
        : currentCart.items.map((item) => item.id === itemId ? { ...item, quantity: amount } : item),
    }
    cartRef.current = optimisticCart
    setState((previous) =>
      previous.userId === userId ? { ...previous, cart: optimisticCart } : previous,
    )
    try {
      const data = await readResponse(
        await fetch('/api/cart', {
          method: 'PATCH',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cartID: currentCart.id,
            itemID: currentItem.id,
            quantity: amount,
          }),
        }),
      )
      publish('cart', data.cart, data.cart?.revision || 0)
      announce('success', amount ? 'Cart updated.' : 'Removed from your cart.')
      return { ok: true, cart: data.cart }
    } catch (error) {
      publish('cart', previousCart, cartRevision.current)
      announce('error', error.message || 'Could not update your cart.')
      return { error: error.message || 'Could not update your cart.' }
    } finally {
      cartBusy.current = false
      setState((previous) => ({ ...previous, cartBusy: false }))
    }
  }, [publish, userId])

  const setWishlistItem = useCallback(async (product, saved) => {
    if (!userId) return { error: 'Sign in with an approved buyer account to save products.' }
    if (wishlistBusy.current) return { error: 'A wishlist update is already processing.' }
    wishlistBusy.current = true
    setState((previous) => ({ ...previous, wishlistBusy: true }))
    const previousItems = wishlistRef.current
    const optimisticItems = saved
      ? previousItems.some((item) => item.productId === product.id)
        ? previousItems
        : [...previousItems, { id: `pending-${product.id}`, productId: product.id, product }]
      : previousItems.filter((item) => item.productId !== product.id)
    wishlistRef.current = optimisticItems
    setState((previous) =>
      previous.userId === userId ? { ...previous, wishlist: optimisticItems } : previous,
    )
    try {
      const data = await readResponse(
        await fetch('/api/wishlist', {
          method: 'PUT',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: product.id, saved }),
        }),
      )
      publish('wishlist', data.items || [], data.revision || 0)
      announce('success', saved ? 'Saved to your wishlist.' : 'Removed from your wishlist.')
      return { ok: true, items: data.items || [] }
    } catch (error) {
      publish('wishlist', previousItems, wishlistRevision.current)
      announce('error', error.message || 'Could not update your wishlist.')
      return { error: error.message || 'Could not update your wishlist.' }
    } finally {
      wishlistBusy.current = false
      setState((previous) => ({ ...previous, wishlistBusy: false }))
    }
  }, [publish, userId])

  const visibleState = state.userId === userId
    ? state
    : {
        userId,
        cart: initialCart,
        wishlist: initialWishlist,
        cartBusy: false,
        wishlistBusy: false,
        cartLoading: Boolean(userId && !initialCart),
        wishlistLoading: Boolean(userId && !initialCart),
        cartError: '',
        wishlistError: '',
      }
  const value = useMemo(() => ({
    cart: visibleState.cart,
    wishlist: visibleState.wishlist,
    cartBusy: visibleState.cartBusy,
    wishlistBusy: visibleState.wishlistBusy,
    cartLoading: visibleState.cartLoading,
    wishlistLoading: visibleState.wishlistLoading,
    cartError: visibleState.cartError,
    wishlistError: visibleState.wishlistError,
    cartCount: visibleState.cart?.items?.reduce((total, item) => total + Number(item.quantity || 0), 0) || 0,
    wishlistCount: visibleState.wishlist?.length || 0,
    addToCart,
    updateCart,
    setWishlistItem,
    refreshCart,
    refreshWishlist,
  }), [visibleState, addToCart, updateCart, setWishlistItem, refreshCart, refreshWishlist])

  return (
    <MarketplaceStateContext.Provider value={value}>
      {children}
    </MarketplaceStateContext.Provider>
  )
}

export function useMarketplaceState() {
  const context = useContext(MarketplaceStateContext)
  if (!context) throw new Error('Marketplace state must be used within MarketplaceStateProvider.')
  return context
}
