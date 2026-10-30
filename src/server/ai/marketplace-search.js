/** Parse buyer questions into tokens and category ids for product lookup. */

const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'for',
  'with',
  'what',
  'which',
  'who',
  'how',
  'when',
  'where',
  'can',
  'could',
  'would',
  'should',
  'is',
  'are',
  'was',
  'were',
  'do',
  'does',
  'did',
  'have',
  'has',
  'had',
  'any',
  'some',
  'all',
  'available',
  'availability',
  'show',
  'list',
  'find',
  'give',
  'me',
  'please',
  'tell',
  'about',
  'on',
  'in',
  'at',
  'to',
  'from',
  'agriconnect',
  'today',
  'now',
  'currently',
  'cheapest',
  'cheap',
  'compare',
  'price',
  'prices',
  'under',
  'below',
  'budget',
  'peso',
  'pesos',
  'product',
  'products',
  'item',
  'items',
  'php',
])

/** Maps words in questions to category ids in seed/catalog. */
const CATEGORY_ALIASES = {
  fruit: ['fruits'],
  fruits: ['fruits'],
  berry: ['fruits'],
  berries: ['fruits'],
  strawberry: ['fruits'],
  strawberries: ['fruits'],
  vegetable: ['vegetables'],
  vegetables: ['vegetables'],
  veggie: ['vegetables'],
  veggies: ['vegetables'],
  greens: ['vegetables'],
  green: ['vegetables'],
  leafy: ['vegetables'],
  lettuce: ['vegetables'],
  kangkong: ['vegetables'],
  tomato: ['vegetables'],
  tomatoes: ['vegetables'],
  banana: ['fruits'],
  bananas: ['fruits'],
  rice: ['rice'],
  grains: ['rice'],
  grain: ['rice'],
  potato: ['roots'],
  potatoes: ['roots'],
  root: ['roots'],
  roots: ['roots'],
}

const BROWSE_INTENT =
  /\b(available|what('s| is)? (there|on|in)|show (me )?|list(ing)?s?|anything|everything|browse|shop for)\b/i

function parseMoneyAmount(raw) {
  const digits = String(raw ?? '').replace(/,/g, '')
  const value = Number.parseInt(digits, 10)
  return Number.isFinite(value) && value > 0 ? value : null
}

export function extractPriceBounds(rawQuery) {
  const query = String(rawQuery ?? '').trim().toLowerCase()
  const spaced = query
    .replace(/₱/g, ' ')
    .replace(/\bphp\b/g, ' ')
    .replace(/(\d)(pesos?)/g, '$1 $2')

  let maxPricePhp = null
  let minPricePhp = null

  const underPatterns = [
    /\b(?:under|below|less than|within|budget(?: of)?|max(?:imum)?|not more than|up to)\s*(?:₱?\s*)?(\d[\d,]*)/i,
    /\b(?:₱?\s*)(\d[\d,]*)\s*(?:pesos?|php)\s*(?:or\s*)?(?:under|below|max)\b/i,
  ]
  for (const pattern of underPatterns) {
    const match = spaced.match(pattern)
    if (match) {
      maxPricePhp = parseMoneyAmount(match[1])
      break
    }
  }

  const overPatterns = [
    /\b(?:over|above|more than|at least|min(?:imum)?)\s*(?:₱?\s*)?(\d[\d,]*)/i,
    /\b(?:₱?\s*)(\d[\d,]*)\s*(?:pesos?|php)\s*(?:or\s*)?(?:over|above|min)\b/i,
  ]
  for (const pattern of overPatterns) {
    const match = spaced.match(pattern)
    if (match) {
      minPricePhp = parseMoneyAmount(match[1])
      break
    }
  }

  if (maxPricePhp == null && /\b(under|below|less than|within|budget|up to)\b/.test(spaced)) {
    const loose = spaced.match(/(\d[\d,]*)\s*pesos?/i) || spaced.match(/(\d[\d,]*)/)
    if (loose) maxPricePhp = parseMoneyAmount(loose[1])
  }

  return { maxPricePhp, minPricePhp }
}

export function parseMarketplaceQuery(rawQuery, categories = []) {
  const query = String(rawQuery ?? '').trim().toLowerCase()
  const { maxPricePhp, minPricePhp } = extractPriceBounds(query)
  const tokens = query
    .split(/[^a-z0-9]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 1 && !STOP_WORDS.has(part))
    .filter((part) => !/^\d+$/.test(part) && !/^\d+pesos?$/.test(part))

  const categoryIds = new Set()
  for (const category of categories) {
    const id = String(category.id || '').toLowerCase()
    const name = String(category.name || '').toLowerCase()
    const categoryTokens = name.split(/[^a-z0-9]+/).filter((token) => token.length > 1)
    const mentioned =
      query.includes(name) ||
      (name && categoryTokens.some((token) => query.includes(token))) ||
      (id && (query.includes(id) || query.includes(id.replaceAll('-', ' '))))
    if (mentioned && id) categoryIds.add(id)
  }
  for (const token of tokens) {
    const aliases = CATEGORY_ALIASES[token]
    if (aliases) aliases.forEach((id) => categoryIds.add(id))
  }

  for (const [word, ids] of Object.entries(CATEGORY_ALIASES)) {
    if (query.includes(word)) ids.forEach((id) => categoryIds.add(id))
  }

  const fulfillment = /\b(pickup|pick up)\b/.test(query)
    ? 'pickup'
    : /\b(delivery|deliver|shipping|ship)\b/.test(query)
      ? 'delivery'
      : null
  const inStockOnly = /\b(in stock|available now|currently available|available today)\b/.test(query)
  const newestOnly = /\b(newest|latest|recent|recently listed|newly listed)\b/.test(query)

  const priceFilterOnly =
    (maxPricePhp != null || minPricePhp != null) && categoryIds.length === 0 && tokens.length === 0

  return {
    query,
    tokens,
    categoryIds: [...categoryIds],
    maxPricePhp,
    minPricePhp,
    priceFilterOnly,
    fulfillment,
    inStockOnly,
    newestOnly,
    browseAll:
      (tokens.length === 0 && categoryIds.length === 0 && BROWSE_INTENT.test(query)) || priceFilterOnly,
  }
}

function withinPriceBounds(product, parsed) {
  const price = Number(product.price)
  if (!Number.isFinite(price)) return false
  if (parsed.maxPricePhp != null && price > parsed.maxPricePhp) return false
  if (parsed.minPricePhp != null && price < parsed.minPricePhp) return false
  return true
}

export function productMatchesSearch(product, parsed) {
  if (!withinPriceBounds(product, parsed)) return false

  if (parsed.priceFilterOnly || parsed.browseAll) return true

  const name = product.name?.toLowerCase() || ''
  const description = product.description?.toLowerCase() || ''
  const location = product.location?.toLowerCase() || ''
  const categoryName = product.category?.name?.toLowerCase() || ''
  const categoryId = product.category?.id || product.categoryId || ''
  const farm = product.seller?.farmName?.toLowerCase() || ''

  if (parsed.categoryIds.length && parsed.categoryIds.includes(categoryId)) return true

  if (parsed.tokens.length === 0 && parsed.categoryIds.length === 0) {
    return parsed.maxPricePhp != null || parsed.minPricePhp != null
  }

  if (parsed.query && name.includes(parsed.query)) return true

  for (const token of parsed.tokens) {
    if (
      name.includes(token) ||
      description.includes(token) ||
      location.includes(token) ||
      categoryName.includes(token) ||
      farm.includes(token) ||
      categoryId.includes(token)
    ) {
      return true
    }
  }

  for (const categoryId of parsed.categoryIds) {
    if (categoryName.includes(categoryId.replace(/-/g, ' '))) return true
  }

  return false
}
