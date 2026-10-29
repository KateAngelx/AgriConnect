#!/usr/bin/env node
function clean(value) {
  return String(value ?? '')
    .trim()
    .replace(/^["']|["']$/g, '')
}

const key =
  clean(process.env.GEMINI_API_KEY) ||
  clean(process.env.GOOGLE_AI_API_KEY) ||
  clean(process.env.GOOGLE_GENERATIVE_AI_API_KEY)

if (!key) {
  console.error('Missing GEMINI_API_KEY')
  process.exit(1)
}

const models = [
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-3.8-flash',
  'gemini-flash-lite-latest',
  'gemini-flash-latest',
]

for (const model of models) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Say OK' }] }] }),
  })
  const text = await response.text()
  let message = text.slice(0, 100).replace(/\s+/g, ' ')
  try {
    const payload = JSON.parse(text)
    message = payload.error?.message || payload.candidates?.[0]?.content?.parts?.[0]?.text || message
  } catch {
    /* keep slice */
  }
  console.log(response.ok ? 'OK' : 'FAIL', response.status, model, '-', message)
}

await new Promise((r) => setTimeout(r, 50))
process.exit(0)
