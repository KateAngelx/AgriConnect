import { isApprovedAdmin, isApprovedBuyer, isApprovedSeller } from './roles'
import { notify } from './notifications'
import { deleteProductReview as deleteStoredReview, save } from './sync'
import { readyStore } from './store'

function orderContainsProduct(order, productId) {
  return (order.items || []).some((item) => {
    const id = typeof item.product === 'object' ? item.product?.id : item.productId
    return id === productId
  })
}

function eligibleOrder(store, userId, productId) {
  return [...store.orders.values()].find(
    (order) =>
      order.buyer === userId &&
      ['delivered', 'completed'].includes(order.status) &&
      orderContainsProduct(order, productId),
  )
}

export async function buyerReviewForProduct(user, productId) {
  if (!isApprovedBuyer(user) || isApprovedSeller(user)) return { eligible: false, review: null }
  const store = await readyStore()
  const product = store.products.find((item) => item.id === productId)
  if (!product || !eligibleOrder(store, user.id, productId))
    return { eligible: false, review: null }
  const review =
    store.productReviews.find(
      (item) => item.productId === productId && item.reviewerId === user.id,
    ) || null
  return { eligible: true, review }
}

export async function saveBuyerReview(user, { productId, rating, body }) {
  if (!isApprovedBuyer(user) || isApprovedSeller(user))
    return { error: 'Product reviews can only be managed from an approved buyer account.' }
  const normalizedProductId = String(productId || '').trim()
  const normalizedRating = Number(rating)
  const normalizedBody = String(body || '').trim()
  if (!normalizedProductId) return { error: 'Choose a product to review.' }
  if (!Number.isInteger(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
    return { error: 'Choose a rating from 1 to 5 stars.' }
  }
  if (normalizedBody.length > 2000) return { error: 'Comments must be 2,000 characters or fewer.' }

  const store = await readyStore()
  const product = store.products.find((item) => item.id === normalizedProductId)
  if (!product || product.status !== 'active' || product.seller?.status !== 'approved') {
    return { error: 'That product is no longer available for review.' }
  }
  if (!eligibleOrder(store, user.id, normalizedProductId)) {
    return {
      error: 'A delivered or completed order containing this product is required to review it.',
    }
  }

  const now = new Date().toISOString()
  const existing = store.productReviews.find(
    (item) => item.productId === normalizedProductId && item.reviewerId === user.id,
  )
  if (existing) {
    existing.rating = normalizedRating
    existing.body = normalizedBody
    existing.reviewerName = user.name
    existing.updatedAt = now
  } else {
    store.productReviews.push({
      id: crypto.randomUUID(),
      productId: normalizedProductId,
      reviewerId: user.id,
      reviewerName: user.name,
      rating: normalizedRating,
      body: normalizedBody,
      createdAt: now,
      updatedAt: now,
    })
  }
  await save()
  const sellerOwnerId =
    product.seller?.ownerId ||
    [...store.users.values()].find((sellerUser) => sellerUser.sellerId === product.seller?.id)?.id
  if (!existing && sellerOwnerId) {
    await notify(
      sellerOwnerId,
      `New review for ${product.name}`,
      `${user.name} left a ${normalizedRating}-star product review.`,
      '/seller/reviews',
    )
  }
  return { ok: true }
}

export async function deleteBuyerReview(user, reviewId) {
  if (!isApprovedBuyer(user) || isApprovedSeller(user))
    return { error: 'Sellers cannot modify or delete customer reviews.' }
  const store = await readyStore()
  const review = store.productReviews.find(
    (item) => item.id === String(reviewId || '') && item.reviewerId === user.id,
  )
  if (!review) return { error: 'Your review could not be found.' }
  await deleteStoredReview(review.id)
  store.productReviews = store.productReviews.filter((item) => item.id !== review.id)
  await save()
  return { ok: true, productId: review.productId }
}

export async function listSellerReviews(user) {
  if (!isApprovedSeller(user)) return []
  const store = await readyStore()
  const sellerId = user.sellerId || store.sellers.find((seller) => seller.ownerId === user.id)?.id
  if (!sellerId) return []
  const products = new Map(
    store.products
      .filter((product) => product.seller?.id === sellerId)
      .map((product) => [product.id, product]),
  )
  return store.productReviews
    .filter(
      (review) =>
        products.has(review.productId) && (review.moderationStatus || 'published') === 'published',
    )
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((review) => ({
      id: review.id,
      productId: review.productId,
      productName: products.get(review.productId).name,
      reviewerName: review.reviewerName || 'Marketplace customer',
      rating: Number(review.rating),
      body: review.body || '',
      createdAt: review.createdAt || '',
      sellerResponse: review.sellerResponse || '',
    }))
}

export async function reviewsForAdmin(user) {
  if (!isApprovedAdmin(user)) return []
  const store = await readyStore()
  return store.productReviews
    .map((review) => ({
      id: review.id,
      productId: review.productId,
      productName:
        store.products.find((product) => product.id === review.productId)?.name ||
        'Product unavailable',
      reviewerName: review.reviewerName || 'Marketplace customer',
      rating: Number(review.rating),
      body: review.body || '',
      createdAt: review.createdAt || '',
      updatedAt: review.updatedAt || review.createdAt || '',
      moderationStatus: review.moderationStatus || 'published',
      moderationHistory: Array.isArray(review.moderationHistory) ? review.moderationHistory : [],
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export async function moderateProductReview(user, { reviewId, action, reason }) {
  if (!isApprovedAdmin(user))
    return { error: 'Only an approved administrator can moderate product reviews.' }
  const normalizedAction = String(action || '')
  const normalizedReason = String(reason || '').trim()
  const validActions = new Set(['hide', 'restore', 'remove'])
  if (!validActions.has(normalizedAction)) return { error: 'Choose a valid moderation action.' }
  if (normalizedReason.length < 3 || normalizedReason.length > 1000) {
    return { error: 'Provide a moderation reason between 3 and 1,000 characters.' }
  }

  const store = await readyStore()
  const review = store.productReviews.find((entry) => entry.id === String(reviewId || ''))
  if (!review) return { error: 'Review not found.' }
  const status = review.moderationStatus || 'published'
  if (normalizedAction === 'hide' && status !== 'published')
    return { error: 'Only published reviews can be hidden.' }
  if (normalizedAction === 'restore' && status !== 'hidden')
    return { error: 'Only hidden reviews can be restored.' }
  if (normalizedAction === 'remove' && status === 'removed')
    return { error: 'This review has already been removed.' }

  const nextStatus =
    normalizedAction === 'hide' ? 'hidden' : normalizedAction === 'remove' ? 'removed' : 'published'
  review.moderationStatus = nextStatus
  review.moderationHistory ??= []
  review.moderationHistory.push({
    action: normalizedAction,
    reason: normalizedReason,
    createdAt: new Date().toISOString(),
    adminId: user.id,
    adminName: user.name || 'Administrator',
  })
  await save()
  return { ok: true, productId: review.productId }
}

export async function sellerRatingSummary(user) {
  const reviews = await listSellerReviews(user)
  const scores = reviews
    .map((review) => review.rating)
    .filter((rating) => rating >= 1 && rating <= 5)
  return {
    reviews,
    reviewCount: scores.length,
    averageRating: scores.length
      ? Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10
      : null,
  }
}
