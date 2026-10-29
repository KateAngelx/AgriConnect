import { currentUser } from '@/server/auth'
import { adminApplicationsFacts } from '@/server/ai/admin-applications-context'
import { aiConfigured, aiRateLimit, chatCompletion } from '@/server/ai/client'
import {
  adminFallbackAnswer,
  buyerFallbackAnswer,
  deliveryFallbackAnswer,
  sellerFallbackAnswer,
} from '@/server/ai/fallback-answers'
import {
  deliveryCourierFacts,
} from '@/server/ai/delivery-context'
import { buyerAnswerDeniesListings, marketplaceProductFacts } from '@/server/ai/marketplace-context'
import { sellerPricingFacts } from '@/server/ai/seller-pricing-context'
import { listOwnedProducts } from '@/server/seller'
import { hasRole, isApprovedSeller } from '@/server/roles'
import { readyStore } from '@/server/store'

function resolveMode(user, requested) {
  const mode = String(requested ?? '').trim().toLowerCase()
  if (mode === 'buyer' || mode === 'marketplace') return 'buyer'
  if (mode === 'seller' && user && isApprovedSeller(user)) return 'seller'
  if (mode === 'delivery' && user && hasRole(user, 'delivery') && user.status === 'approved') {
    return 'delivery'
  }
  if (mode === 'admin' && user && hasRole(user, 'admin')) return 'admin'
  if (user && hasRole(user, 'admin')) return 'admin'
  if (user && hasRole(user, 'delivery') && user.status === 'approved') return 'delivery'
  if (user && isApprovedSeller(user)) return 'seller'
  return 'buyer'
}

function respondWithFallback({ answer, mode, facts, notice }) {
  return Response.json({
    answer,
    mode,
    facts,
    source: 'database',
    notice: notice || undefined,
  })
}

export async function POST(request) {
  const user = await currentUser()
  let body = {}
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }
  const question = String(body.question ?? '').trim().slice(0, 1200)
  if (question.length < 2) {
    return Response.json({ error: 'Type a question for the assistant.' }, { status: 400 })
  }
  const mode = resolveMode(user, body.mode)
  const rateKey = user?.id ? `${mode}:${user.id}` : `guest:${request.headers.get('x-forwarded-for') || 'local'}`
  if (!aiRateLimit(rateKey, mode === 'buyer' ? 24 : 18)) {
    return Response.json({ error: 'Too many assistant requests. Try again shortly.' }, { status: 429 })
  }

  if (mode === 'buyer') {
    const facts = await marketplaceProductFacts({ query: question })
    if (!aiConfigured()) {
      return respondWithFallback({ answer: buyerFallbackAnswer(facts), mode, facts })
    }
    const system = [
      'You are AgriConnect buyer assistant for Filipino agriculture.',
      'Compare prices across sellers using ONLY JSON facts.products and facts.catalogSummary.',
      'If facts.count > 0, you MUST list those products with ₱ price and unit — never say count is 0.',
      'When searchInterpretation.maxPricePhp is set, facts.products are already filtered to that budget in PHP.',
      'Never invent listings. Label palengke comparisons as estimates.',
      'Give complete answers with bullet lists when comparing multiple items; do not stop mid-list.',
    ].join(' ')
    const result = await chatCompletion({
      system,
      user: `Question:\n${question}\n\nFacts:\n${JSON.stringify(facts)}`,
    })
    if (result.content && !buyerAnswerDeniesListings(result.content, facts)) {
      return Response.json({ answer: result.content, mode, facts, source: 'ai+database' })
    }
    if (result.content && buyerAnswerDeniesListings(result.content, facts)) {
      return respondWithFallback({
        answer: buyerFallbackAnswer(facts, { showNote: false }),
        mode,
        facts,
        notice: 'Answer corrected from live AgriConnect listings.',
      })
    }
    return respondWithFallback({
      answer: buyerFallbackAnswer(facts),
      mode,
      facts,
      notice: result.error,
    })
  }

  if (mode === 'seller') {
    if (!user || !isApprovedSeller(user)) {
      return Response.json({ error: 'Seller access required.' }, { status: 403 })
    }
    const [pricing, products] = await Promise.all([sellerPricingFacts(user), listOwnedProducts(user)])
    const lowStock = products.filter((p) => p.status === 'active' && p.stock < 10)
    const facts = { pricing, lowStockCount: lowStock.length, lowStock: lowStock.slice(0, 12) }
    if (!aiConfigured()) {
      return respondWithFallback({
        answer: sellerFallbackAnswer(pricing, lowStock),
        mode,
        facts,
      })
    }
    const system = [
      'You help AgriConnect sellers with pricing vs other sellers on the platform.',
      'Use ONLY JSON facts. Suggest raise/lower/hold with reasoning. Never claim you changed prices.',
      'Give complete answers; use bullets for multiple products or comparisons.',
    ].join(' ')
    const result = await chatCompletion({
      system,
      user: `Seller question:\n${question}\n\nFacts:\n${JSON.stringify(facts)}`,
    })
    if (result.content) {
      return Response.json({ answer: result.content, mode, facts, source: 'ai+database' })
    }
    return respondWithFallback({
      answer: sellerFallbackAnswer(pricing, lowStock),
      mode,
      facts,
      notice: result.error,
    })
  }

  if (mode === 'delivery') {
    if (!user || !hasRole(user, 'delivery') || user.status !== 'approved') {
      return Response.json({ error: 'Approved delivery partner access required.' }, { status: 403 })
    }
    const facts = await deliveryCourierFacts(user, body.courierLat, body.courierLng)
    if (!aiConfigured()) {
      return respondWithFallback({
        answer: deliveryFallbackAnswer(facts),
        mode,
        facts,
      })
    }
    const system = [
      'You help AgriConnect couriers prioritize deliveries and estimate time.',
      'Use prioritizedJobs order (nearest first when locationUsed is true).',
      'Mention km, travelMinutesEstimate, and estimatedArrivalAt from facts only.',
      'Never invent addresses; preview jobs hide full addresses until accepted.',
      'Give complete prioritized lists with ETAs when relevant.',
    ].join(' ')
    const result = await chatCompletion({
      system,
      user: `Courier question:\n${question}\n\nFacts:\n${JSON.stringify(facts)}`,
    })
    if (result.content) {
      return Response.json({ answer: result.content, mode, facts, source: 'ai+database' })
    }
    return respondWithFallback({
      answer: deliveryFallbackAnswer(facts),
      mode,
      facts,
      notice: result.error,
    })
  }

  if (mode === 'admin') {
    if (!user || !hasRole(user, 'admin')) {
      return Response.json({ error: 'Administrator access required.' }, { status: 403 })
    }
    const applicationId = String(body.applicationId ?? '').trim()
    const facts = await adminApplicationsFacts({ applicationId })
    const store = await readyStore()
    const application = applicationId
      ? store.applications.find((item) => item.id === applicationId)
      : null
    if (!aiConfigured()) {
      return respondWithFallback({
        answer: adminFallbackAnswer(facts, application),
        mode,
        facts,
      })
    }
    const system = [
      'You assist AgriConnect admins reviewing seller/delivery applications.',
      'Use screening.category and screening.issues from facts. Never auto-approve or reject.',
      'Say if applicant looks eligible based on completeness, not identity fraud detection.',
      'Summarize all pending applicants mentioned in facts; use bullets and do not truncate mid-answer.',
    ].join(' ')
    const result = await chatCompletion({
      system,
      user: `Admin question:\n${question}\n\nFacts:\n${JSON.stringify(facts)}`,
    })
    if (result.content) {
      return Response.json({ answer: result.content, mode, facts, source: 'ai+database' })
    }
    return respondWithFallback({
      answer: adminFallbackAnswer(facts, application),
      mode,
      facts,
      notice: result.error,
    })
  }

  return Response.json({ error: 'Unknown assistant mode.' }, { status: 400 })
}
