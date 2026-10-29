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

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`
const response = await fetch(url)
const payload = await response.json()
const models = (payload.models || [])
  .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
  .map((m) => m.name.replace(/^models\//, ''))
  .sort()

console.log('generateContent models:', models.length)
for (const name of models) console.log(' ', name)

await new Promise((r) => setTimeout(r, 50))
process.exit(0)
