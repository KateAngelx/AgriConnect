/** Server-only AI provider config (keys never sent to the browser). */

function cleanEnv(value) {
  return String(value ?? '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .trim()
}

export function aiForceDatabase() {
  return cleanEnv(process.env.OPENAI_FORCE_DATABASE) === '1' || cleanEnv(process.env.AI_FORCE_DATABASE) === '1'
}

export function aiProviderId() {
  const explicit = cleanEnv(process.env.AI_PROVIDER).toLowerCase()
  if (explicit) return explicit
  if (cleanEnv(process.env.GROQ_API_KEY)) return 'groq'
  if (cleanEnv(process.env.OPENROUTER_API_KEY)) return 'openrouter'
  if (geminiApiKey()) return 'gemini'
  if (cleanEnv(process.env.OPENAI_API_KEY)) return 'openai'
  return 'none'
}

export function aiModel() {
  const model = cleanEnv(process.env.AI_MODEL) || cleanEnv(process.env.OPENAI_MODEL)
  if (model) return model
  const provider = aiProviderId()
  if (provider === 'groq') return 'llama-3.1-8b-instant'
  if (provider === 'openrouter') return 'google/gemma-2-9b-it:free'
  if (provider === 'gemini') return 'gemini-3.5-flash-lite'
  return 'gpt-4o-mini'
}

/** Ordered Gemini models for new AI Studio keys (2.x often 404 for new users). */
export function geminiModelCandidates() {
  const primary = aiModel()
  const fallbacks = [
    'gemini-3.5-flash-lite',
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite',
    'gemini-3.6-flash',
    'gemini-3.7-flash',
    'gemini-3.8-flash',
    'gemini-flash-lite-latest',
    'gemini-flash-latest',
  ]
  const ordered = [primary]
  for (const model of fallbacks) {
    if (model !== primary) ordered.push(model)
  }
  return [...new Set(ordered)]
}

export function geminiApiKey() {
  return (
    cleanEnv(process.env.GEMINI_API_KEY) ||
    cleanEnv(process.env.GOOGLE_AI_API_KEY) ||
    cleanEnv(process.env.GOOGLE_GENERATIVE_AI_API_KEY)
  )
}

export function providerApiKey(provider = aiProviderId()) {
  if (provider === 'groq') return cleanEnv(process.env.GROQ_API_KEY)
  if (provider === 'openrouter') return cleanEnv(process.env.OPENROUTER_API_KEY)
  if (provider === 'gemini') return geminiApiKey()
  if (provider === 'openai') return cleanEnv(process.env.OPENAI_API_KEY)
  return ''
}

export function aiLlmEnabled() {
  if (aiForceDatabase()) return false
  return Boolean(providerApiKey())
}

export function describeAiSetup() {
  const provider = aiProviderId()
  const forceDatabase = aiForceDatabase()
  const hasKey = Boolean(providerApiKey(provider))
  const enabled = aiLlmEnabled()
  return {
    provider,
    hasKey,
    forceDatabase,
    model: aiModel(),
    mode: enabled ? provider : 'database',
    enabled,
  }
}

/** OpenAI-compatible chat endpoint + auth for groq / openrouter / openai. */
export function openAiCompatibleChatConfig() {
  const provider = aiProviderId()
  const key = providerApiKey(provider)
  if (!key) return null
  if (provider === 'groq') {
    return {
      provider,
      url: 'https://api.groq.com/openai/v1/chat/completions',
      key,
      model: aiModel(),
      extraHeaders: {},
    }
  }
  if (provider === 'openrouter') {
    return {
      provider,
      url: 'https://openrouter.ai/api/v1/chat/completions',
      key,
      model: aiModel(),
      extraHeaders: {
        'HTTP-Referer': cleanEnv(process.env.OPENROUTER_SITE_URL) || 'https://agriconnect.app',
        'X-Title': cleanEnv(process.env.OPENROUTER_APP_NAME) || 'AgriConnect',
      },
    }
  }
  if (provider === 'openai') {
    return {
      provider,
      url: 'https://api.openai.com/v1/chat/completions',
      key,
      model: aiModel(),
      extraHeaders: {},
    }
  }
  return null
}

export function geminiGenerateConfig() {
  if (aiProviderId() !== 'gemini') return null
  const key = geminiApiKey()
  if (!key) return null
  const model = aiModel()
  return {
    provider: 'gemini',
    key,
    model,
    url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
  }
}
