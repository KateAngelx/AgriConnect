const PRIVATE_REQUEST_PATTERNS = [
  /\b(admin|administrator|platform admin|admin dashboard)\b/i,
  /\b(all users|other users?|user list|customer list|seller list|courier list)\b/i,
  /\b(platform revenue|platform commission settings|commission settings|admin earnings|admin payout)\b/i,
  /\b(other seller|seller.*earnings|seller.*payout|seller.*inventory|seller.*private)\b/i,
  /\b(other buyer|buyer.*address|buyer.*contact|buyer.*phone|customer.*address|customer.*phone)\b/i,
  /\b(courier.*earning|courier.*commission|courier.*private|partner.*location)\b/i,
  /\b(password|password hash|api key|secret key|service role|environment variable)\b/i,
  /\b(database schema|supabase tables|internal prompt|system prompt)\b/i,
]

function roleName(mode) {
  return mode === 'delivery' ? 'courier' : mode
}

export function privateAssistantRequest(question, mode) {
  const text = String(question ?? '').trim()
  if (!text) return false

  if (mode === 'admin') {
    return /\b(password hash|api key|secret key|service role|database schema|system prompt)\b/i.test(text)
  }

  const privateRequest = PRIVATE_REQUEST_PATTERNS.some((pattern) => pattern.test(text))

  if (!privateRequest) return false
  if (
    mode === 'buyer' &&
    /^(show|list|who are the|which)\b/i.test(text) &&
    /\b(available )?sellers?\b/i.test(text) &&
    !/\b(earnings?|payouts?|inventory|address(es)?|phone|private)\b/i.test(text)
  ) {
    return false
  }
  return true
}

export function restrictedAssistantAnswer(question, mode) {
  return `I can help with AgriConnect as a ${roleName(mode)}, but I cannot access or discuss private ${roleName(mode)} data outside my permissions. I cannot reveal other accounts, passwords, API keys, internal database details, or private address/contact information. I can help with public marketplace listings, relevant platform features, and permitted account information.`
}
