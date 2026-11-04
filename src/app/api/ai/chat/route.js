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
import { listOwnedOrders, listOwnedProducts, sellerFinancials } from '@/server/seller'
import { hasRole, isApprovedSeller } from '@/server/roles'
import { readyStore } from '@/server/store'
import { privateAssistantRequest, restrictedAssistantAnswer } from '@/server/ai/access-policy'

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

function conversationalGreeting(question) {
  return /^(hi|hello|hey|good morning|good afternoon|good evening|kumusta|kamusta)[!. ]*$/i.test(
    String(question ?? '').trim(),
  )
}

function assistantHelpQuestion(question) {
  return /\b(what can you do|how can you help|help me|your capabilities)\b/i.test(
    String(question ?? '').trim(),
  )
}

function sellerActionQuestion(question) {
  return /\b(complete|cancel|confirm|prepare|ready|picked up|deliver|update|mark).{0,25}\b(order|orders)\b/i.test(
    String(question ?? '').trim(),
  )
}

function sellerOrderCountQuestion(question) {
  if (/\b(how many|number of|count|total)\b/i.test(String(question ?? '')) &&
    /\b(completed?|cancelled?|open|active|pending|delivered?|picked[- ]?up)\b.{0,15}\borders?\b/i.test(
      String(question ?? ''),
    )) return true
  return false
}

function sellerStatusOverviewQuestion(question) {
  return /\b(completed?|cancelled?|open|active|pending|delivered?|picked[- ]?up)\b.{0,35}\borders?\b/i.test(
    String(question ?? '').trim(),
  )
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
  if (conversationalGreeting(question)) {
    const roleHelp =
      mode === 'seller'
        ? ' I can help compare your product prices, identify low-stock items, or review marketplace pricing.'
        : mode === 'delivery'
          ? ' I can help prioritize deliveries and explain route estimates.'
          : mode === 'admin'
            ? ' I can help summarize applications and review eligibility information.'
            : ' I can help find available products, compare prices, and answer farming questions.'
    return Response.json({
      answer: `Hello!${roleHelp} What would you like to check?`,
      mode,
      source: 'assistant',
      facts: {},
    })
  }
  if (assistantHelpQuestion(question)) {
    const roleHelp =
      mode === 'seller'
        ? 'I can compare your prices, flag low-stock products, and explain marketplace pricing. Ask about a specific listing for more focused guidance.'
        : mode === 'delivery'
          ? 'I can prioritize open jobs, explain estimated distances and arrival times, and help you plan your route.'
          : mode === 'admin'
            ? 'I can summarize pending applications, identify missing information, and explain eligibility screening without approving or rejecting anyone.'
            : 'I can find available products, compare prices and sellers, explain delivery or pickup choices, and answer practical farming questions.'
    return Response.json({ answer: roleHelp, mode, source: 'assistant', facts: {} })
  }
  if (privateAssistantRequest(question, mode)) {
    return Response.json({
      answer: restrictedAssistantAnswer(question, mode),
      mode,
      source: 'policy',
      facts: {},
    })
  }
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
      'Explain general farming, crops, planting, pest, weather, storage, and agricultural questions accurately and safely.',
      'Understand the user question first and answer unexpected or conversational questions directly.',
      'Return clean conversational text without Markdown formatting, asterisks, hashes, tables, or raw bullet symbols.',
      'Use short paragraphs and plain numbered steps when steps are helpful.',
      'Compare prices across sellers using ONLY JSON facts.products and facts.catalogSummary.',
      'If facts.count > 0, you MUST list those products with ₱ price and unit — never say count is 0.',
      'When searchInterpretation.maxPricePhp is set, facts.products are already filtered to that budget in PHP.',
      'Never invent listings, stock, locations, fulfillment, categories, dates, or listedAt values.',
      'Use sellerLocation and location facts only for stated pickup or farm locations; do not convert them into unavailable schedules.',
      'Describe a product as available only when available is true and stock is greater than 0.',
      'Use listedAt only as the listing date; never call it a harvest, delivery, or expiry date.',
      'When asked for delivery or pickup, include only products whose corresponding facts are true.',
      'When asked for newest listings, order by listedAt descending and state that it is the date listed on AgriConnect.',
      'If facts.count is 0, say there is no verified matching listing instead of guessing.',
      'Label palengke comparisons as estimates.',
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
    const [pricing, products, orders, financials] = await Promise.all([
      sellerPricingFacts(user),
      listOwnedProducts(user),
      listOwnedOrders(user),
      sellerFinancials(user),
    ])
    const lowStock = products.filter((p) => p.status === 'active' && p.stock < 10)
    const normalizedOrders = orders.map((order) => ({
      ...order,
      normalizedStatus: String(order.status ?? '').trim().toLowerCase().replaceAll('_', '-'),
    }))
    const facts = {
      pricing,
      lowStockCount: lowStock.length,
      lowStock: lowStock.slice(0, 12),
      orderCounts: {
        total: orders.length,
        completed: financials.completedOrders,
        delivered: normalizedOrders.filter((order) => order.normalizedStatus === 'delivered').length,
        pickedUp: normalizedOrders.filter((order) => order.normalizedStatus === 'picked-up').length,
        cancelled: normalizedOrders.filter((order) => order.normalizedStatus === 'cancelled').length,
        open: normalizedOrders.filter((order) => !['completed', 'cancelled', 'delivered', 'picked-up'].includes(order.normalizedStatus)).length,
      },
      completedOrders: financials.completedOrders,
      grossSales: financials.grossSales ?? financials.gross,
    }
    if (sellerOrderCountQuestion(question) || (sellerStatusOverviewQuestion(question) && !sellerActionQuestion(question))) {
      const normalized = question.toLowerCase()
      const status = normalized.includes('cancel') ? 'cancelled'
        : normalized.includes('deliver') ? 'delivered'
        : normalized.includes('picked up') || normalized.includes('picked-up') ? 'pickedUp'
        : normalized.includes('complete') ? 'completed'
        : normalized.includes('open') || normalized.includes('active') || normalized.includes('pending') ? 'open'
        : 'total'
      const count = facts.orderCounts[status] ?? facts.orderCounts.total
      const statusLabel = status === 'pickedUp' ? 'picked up' : status === 'open' ? 'open' : status
      return Response.json({
        answer: status === 'total'
          ? `You currently have ${count} orders in total.`
          : `You currently have ${count} ${statusLabel} order${count === 1 ? '' : 's'}.`,
        mode,
        source: 'seller-data',
        facts,
      })
    }
    if (sellerActionQuestion(question)) {
      return Response.json({
        answer: 'I can explain which order action is available, but I cannot change an order from chat. Open My Orders, select the order, and use its status button: Confirm, Start preparing, Mark ready, Mark picked up, or Complete order. The available button depends on the order’s current fulfillment status.',
        mode,
        source: 'assistant',
        facts,
      })
    }
    if (!aiConfigured()) {
      return respondWithFallback({
        answer: sellerFallbackAnswer(pricing, lowStock),
        mode,
        facts,
      })
    }
    const system = [
      'You are the AgriConnect seller assistant.',
      'Understand the user question first, answer that question directly, then add useful role-specific context.',
      'Use the supplied live facts for AgriConnect listings, stock, orders, financial totals, and other seller information.',
      'You may also answer general agriculture, business, pricing, crop, storage, and logistics questions from your knowledge.',
      'Do not invent platform facts. If the question needs a live fact not present in the JSON, say that it is not available or ask for the relevant details.',
      'Never claim you changed prices, order statuses, inventory, or account settings; chat can provide guidance only.',
      'Return clean conversational text without Markdown symbols, asterisks, hashes, tables, or raw bullet symbols.',
      'Give short complete answers and plain numbered steps only when useful.',
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
      'Understand the full courier question and answer route, delivery-status, safety, workload, and general logistics questions directly.',
      'Use agricultural knowledge when it is relevant, but never invent courier jobs, addresses, locations, or platform data.',
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
      'Understand the full admin question and answer general screening, operational, compliance, and platform-management questions directly.',
      'Never invent applications, accounts, approvals, private contact details, or platform statistics.',
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
