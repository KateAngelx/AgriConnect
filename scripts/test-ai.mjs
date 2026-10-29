#!/usr/bin/env node
/**
 * Test configured AI provider (Groq, Gemini, OpenAI, OpenRouter).
 * Usage: node --env-file=.env.local scripts/test-ai.mjs
 */
function clean(value) {
  return String(value ?? '')
    .trim()
    .replace(/^["']|["']$/g, '')
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function exitSoon(code) {
  await sleep(80)
  process.exit(code)
}

const forceDatabase =
  clean(process.env.OPENAI_FORCE_DATABASE) === '1' || clean(process.env.AI_FORCE_DATABASE) === '1'

let provider = clean(process.env.AI_PROVIDER).toLowerCase()
if (!provider) {
  if (clean(process.env.GROQ_API_KEY)) provider = 'groq'
  else if (clean(process.env.OPENROUTER_API_KEY)) provider = 'openrouter'
  else if (
    clean(process.env.GEMINI_API_KEY) ||
    clean(process.env.GOOGLE_AI_API_KEY) ||
    clean(process.env.GOOGLE_GENERATIVE_AI_API_KEY)
  )
    provider = 'gemini'
  else if (clean(process.env.OPENAI_API_KEY)) provider = 'openai'
  else provider = 'none'
}

const model =
  clean(process.env.AI_MODEL) ||
  clean(process.env.OPENAI_MODEL) ||
  (provider === 'groq'
    ? 'llama-3.1-8b-instant'
    : provider === 'gemini'
      ? 'gemini-3.5-flash-lite'
      : provider === 'openrouter'
        ? 'google/gemma-2-9b-it:free'
        : 'gpt-4o-mini')

function geminiModelCandidates(primary) {
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
  for (const name of fallbacks) {
    if (name !== primary) ordered.push(name)
  }
  return [...new Set(ordered)]
}

function suggestedGeminiModel(bodyText) {
  const match = String(bodyText ?? '').match(/use models\/([a-z0-9.-]+)/i)
  return match?.[1] || null
}

function geminiRetryable(status, bodyText) {
  if (status === 404 || status === 503 || status === 429) return true
  const lower = String(bodyText ?? '').toLowerCase()
  return /no longer available|high demand|not found|unavailable|try again/i.test(lower)
}

console.log('AI setup')
console.log('  provider:', provider)
console.log('  model:', model)
console.log('  forceDatabase:', forceDatabase)

if (forceDatabase) {
  console.log('\n[OK] Database-only mode. Set OPENAI_FORCE_DATABASE=0 and add GROQ_API_KEY for free LLM.')
  await exitSoon(0)
}

async function testOpenAiCompatible(url, key, extraHeaders = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        { role: 'system', content: 'Reply with exactly OK' },
        { role: 'user', content: 'ping' },
      ],
    }),
  })
  const text = await response.text()
  let payload = {}
  try {
    payload = JSON.parse(text)
  } catch {
    payload = {}
  }
  return { response, payload, text }
}

async function testGeminiOnce(key, modelName) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent?key=${encodeURIComponent(key)}`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: 'Reply with exactly OK' }] },
      contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
    }),
  })
  const text = await response.text()
  let payload = {}
  try {
    payload = JSON.parse(text)
  } catch {
    payload = {}
  }
  const content = payload.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || ''
  return { response, content, text, payload }
}

async function testGeminiWithFallbacks(key) {
  const models = geminiModelCandidates(model)
  let last = null
  for (let i = 0; i < models.length; i += 1) {
    const modelName = models[i]
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const result = await testGeminiOnce(key, modelName)
      last = result
      if (result.response.ok && result.content.includes('OK')) {
        console.log('\n[OK] Gemini connected.', modelName !== model ? `(model: ${modelName})` : '')
        await exitSoon(0)
      }
      const suggested = suggestedGeminiModel(result.text)
      if (suggested && !models.includes(suggested)) models.splice(i + 1, 0, suggested)
      if (!geminiRetryable(result.response.status, result.text)) {
        console.log('\n[FAIL]', result.response.status, result.text.slice(0, 240))
        await exitSoon(1)
      }
      if (result.response.status === 503 && attempt === 0) {
        console.log(`  retry ${modelName} (503 high demand)...`)
        await sleep(2000)
        continue
      }
      console.log(`  skip ${modelName}:`, result.response.status, (result.payload?.error?.message || '').slice(0, 80))
      break
    }
  }
  console.log('\n[FAIL] All Gemini models failed. Last:', last?.response?.status, last?.text?.slice(0, 200))
  await exitSoon(1)
}

try {
  if (provider === 'groq') {
    const key = clean(process.env.GROQ_API_KEY)
    if (!key) throw new Error('Missing GROQ_API_KEY')
    const { response, payload, text } = await testOpenAiCompatible(
      'https://api.groq.com/openai/v1/chat/completions',
      key,
    )
    if (response.ok && payload.choices?.[0]?.message?.content) {
      console.log('\n[OK] Groq connected.')
      await exitSoon(0)
    }
    console.log('\n[FAIL]', response.status, payload?.error?.message || text.slice(0, 200))
    await exitSoon(1)
  }

  if (provider === 'openrouter') {
    const key = clean(process.env.OPENROUTER_API_KEY)
    if (!key) throw new Error('Missing OPENROUTER_API_KEY')
    const { response, payload, text } = await testOpenAiCompatible(
      'https://openrouter.ai/api/v1/chat/completions',
      key,
      {
        'HTTP-Referer': clean(process.env.OPENROUTER_SITE_URL) || 'http://localhost:3000',
        'X-Title': 'AgriConnect',
      },
    )
    if (response.ok && payload.choices?.[0]?.message?.content) {
      console.log('\n[OK] OpenRouter connected.')
      await exitSoon(0)
    }
    console.log('\n[FAIL]', response.status, payload?.error?.message || text.slice(0, 200))
    await exitSoon(1)
  }

  if (provider === 'gemini') {
    const key =
      clean(process.env.GEMINI_API_KEY) ||
      clean(process.env.GOOGLE_AI_API_KEY) ||
      clean(process.env.GOOGLE_GENERATIVE_AI_API_KEY)
    if (!key) throw new Error('Missing GEMINI_API_KEY')
    await testGeminiWithFallbacks(key)
  }

  if (provider === 'openai') {
    const key = clean(process.env.OPENAI_API_KEY)
    if (!key) throw new Error('Missing OPENAI_API_KEY')
    const { response, payload, text } = await testOpenAiCompatible(
      'https://api.openai.com/v1/chat/completions',
      key,
    )
    if (response.ok && payload.choices?.[0]?.message?.content) {
      console.log('\n[OK] OpenAI connected.')
      await exitSoon(0)
    }
    console.log('\n[FAIL]', response.status, payload?.error?.message || text.slice(0, 200))
    await exitSoon(1)
  }

  console.log('\n[FAIL] No provider configured. See docs/FREE-AI-PROVIDERS.md')
  await exitSoon(1)
} catch (error) {
  console.error('\n[FAIL]', error.message)
  await exitSoon(1)
}
