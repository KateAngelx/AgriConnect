import {
  aiLlmEnabled,
  aiModel,
  aiProviderId,
  describeAiSetup,
  geminiApiKey,
  geminiModelCandidates,
  openAiCompatibleChatConfig,
} from '@/server/ai/ai-config'

const rateBucket = new Map()

export function aiConfigured() {
  return aiLlmEnabled()
}

export function aiRateLimit(key, max = 20, windowMs = 60_000) {
  const now = Date.now()
  const bucket = rateBucket.get(key) || []
  const fresh = bucket.filter((time) => now - time < windowMs)
  if (fresh.length >= max) return false
  fresh.push(now)
  rateBucket.set(key, fresh)
  return true
}

function parseProviderFailure(status, bodyText) {
  const lower = String(bodyText ?? '').toLowerCase()
  const billing =
    status === 429 ||
    /insufficient|no credits|billing|quota|exceeded|rate limit|payment|resource exhausted/i.test(lower)
  const userMessage = billing
    ? 'LLM provider limit or billing issue. AgriConnect will answer using live data instead.'
    : status >= 500
      ? 'AI provider is temporarily unavailable. Using AgriConnect data instead.'
      : 'AI provider rejected the request. Using AgriConnect data instead.'
  return {
    error: userMessage,
    useDatabaseFallback: billing || status >= 500 || status === 401,
    billing,
    status,
  }
}

/** Lightweight connectivity check (admin / scripts). */
export async function probeOpenAi() {
  const setup = describeAiSetup()
  if (!setup.enabled) {
    return {
      ok: setup.forceDatabase,
      message: setup.forceDatabase
        ? 'Database-only mode (OPENAI_FORCE_DATABASE=1 or AI_FORCE_DATABASE=1).'
        : `Set AI_PROVIDER and API key (e.g. GROQ_API_KEY). Current provider: ${setup.provider}`,
    }
  }
  const result = await chatCompletion({
    system: 'You are a health check. Reply with exactly: OK',
    user: 'ping',
    temperature: 0,
  })
  if (result.content?.includes('OK')) {
    return { ok: true, message: `Connected (${setup.provider} / ${setup.model}).` }
  }
  return {
    ok: false,
    message: result.error || 'Provider did not respond.',
    billing: Boolean(result.billing),
    useDatabaseFallback: Boolean(result.useDatabaseFallback),
  }
}

async function chatOpenAiCompatible({ system, user, temperature }) {
  const config = openAiCompatibleChatConfig()
  if (!config) return { error: 'OpenAI-compatible provider not configured.', useDatabaseFallback: true }
  const response = await fetch(config.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.key}`,
      'Content-Type': 'application/json',
      ...config.extraHeaders,
    },
    body: JSON.stringify({
      model: config.model,
      temperature,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })
  const bodyText = await response.text()
  if (!response.ok) return parseProviderFailure(response.status, bodyText)
  let payload
  try {
    payload = JSON.parse(bodyText)
  } catch {
    return { error: 'AI returned invalid JSON.', useDatabaseFallback: true }
  }
  const content = payload.choices?.[0]?.message?.content
  if (!content) return { error: 'AI returned an empty response.', useDatabaseFallback: true }
  return { content }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function suggestedGeminiModelFromError(bodyText) {
  const match = String(bodyText ?? '').match(/use models\/([a-z0-9.-]+)/i)
  return match?.[1] || null
}

function isGeminiModelRetryable(status, bodyText) {
  if (status === 404 || status === 503 || status === 429) return true
  const lower = String(bodyText ?? '').toLowerCase()
  return /no longer available|high demand|not found|unavailable|resource exhausted|try again later/i.test(
    lower,
  )
}

async function chatGeminiOnce({ model, key, system, user, temperature }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: {
        temperature,
        maxOutputTokens: 4096,
      },
    }),
  })
  const bodyText = await response.text()
  if (!response.ok) {
    return {
      ...parseProviderFailure(response.status, bodyText),
      status: response.status,
      bodyText,
      retryModel: isGeminiModelRetryable(response.status, bodyText),
      suggestedModel: suggestedGeminiModelFromError(bodyText),
    }
  }
  let payload
  try {
    payload = JSON.parse(bodyText)
  } catch {
    return { error: 'Gemini returned invalid JSON.', useDatabaseFallback: true, retryModel: false }
  }
  const blockReason = payload.promptFeedback?.blockReason
  if (blockReason) {
    return {
      error: `Gemini blocked the prompt (${blockReason}). Using AgriConnect data instead.`,
      useDatabaseFallback: true,
      retryModel: false,
    }
  }
  const content = payload.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || ''
  if (!content.trim()) {
    return { error: 'Gemini returned an empty response.', useDatabaseFallback: true, retryModel: false }
  }
  return { content, modelUsed: model }
}

async function chatGemini({ system, user, temperature }) {
  const key = geminiApiKey()
  if (!key) return { error: 'Google AI Studio (Gemini) is not configured.', useDatabaseFallback: true }

  const models = [...geminiModelCandidates()]
  let lastFailure = null

  for (let index = 0; index < models.length; index += 1) {
    const model = models[index]
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const result = await chatGeminiOnce({ model, key, system, user, temperature })
      if (result.content) return result
      lastFailure = result
      if (result.suggestedModel && !models.includes(result.suggestedModel)) {
        models.splice(index + 1, 0, result.suggestedModel)
      }
      if (!result.retryModel) {
        return {
          error: result.error || 'Gemini rejected the request.',
          useDatabaseFallback: Boolean(result.useDatabaseFallback),
          billing: result.billing,
        }
      }
      if (result.status === 503 && attempt === 0) {
        await sleep(2000)
        continue
      }
      break
    }
  }

  return {
    error:
      lastFailure?.error ||
      'All configured Gemini models are unavailable. Using AgriConnect data instead.',
    useDatabaseFallback: true,
    billing: lastFailure?.billing,
    status: lastFailure?.status,
  }
}

export async function chatCompletion({ system, user, temperature = 0.2 }) {
  if (!aiLlmEnabled()) {
    return {
      error: 'LLM disabled (force database mode or missing API key). Using AgriConnect data mode.',
      useDatabaseFallback: true,
    }
  }
  try {
    const provider = aiProviderId()
    if (provider === 'gemini') return await chatGemini({ system, user, temperature })
    if (['openai', 'groq', 'openrouter'].includes(provider)) {
      return await chatOpenAiCompatible({ system, user, temperature })
    }
    return { error: `Unknown AI_PROVIDER: ${provider}`, useDatabaseFallback: true }
  } catch {
    return {
      error: 'Could not reach AI provider. Using AgriConnect data instead.',
      useDatabaseFallback: true,
    }
  }
}
