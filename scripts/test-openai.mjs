#!/usr/bin/env node
/**
 * Verify OpenAI API key and billing (does not print the key).
 * Usage: node --env-file=.env.local scripts/test-openai.mjs
 */
function openAiApiKey() {
  const raw = String(process.env.OPENAI_API_KEY ?? '').trim()
  return raw.replace(/^["']|["']$/g, '').trim()
}

const forceDatabase = String(process.env.OPENAI_FORCE_DATABASE ?? '').trim() === '1'
const model = String(process.env.OPENAI_MODEL ?? 'gpt-4o-mini').trim()
const key = openAiApiKey()

console.log('OpenAI setup')
console.log('  model:', model)
console.log('  hasKey:', Boolean(key))
console.log('  forceDatabase:', forceDatabase)

if (forceDatabase) {
  console.log('\n[OK] Database-only mode (OPENAI_FORCE_DATABASE=1). Set to 0 to enable OpenAI.')
  process.exit(0)
}

if (!key) {
  console.error('\n[FAIL] Set OPENAI_API_KEY in .env.local or Make environment variables.')
  process.exit(1)
}

const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
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

if (response.ok && payload.choices?.[0]?.message?.content) {
  console.log('\n[OK] OpenAI connected.')
  process.exit(0)
}

const msg = payload?.error?.message || text.slice(0, 200)
console.log('\n[FAIL]', response.status, msg)
if (/credit|billing|quota|429/i.test(msg)) {
  console.log('\nAdd credits: https://platform.openai.com/settings/organization/billing/')
  console.log('Or set OPENAI_FORCE_DATABASE=1 for defense without OpenAI.')
}
process.exit(1)
