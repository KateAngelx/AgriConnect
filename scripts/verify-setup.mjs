#!/usr/bin/env node
/**
 * Checks Supabase connectivity and schema readiness. Does not print secrets.
 * Usage: node --env-file=.env.local scripts/verify-setup.mjs
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const checks = []

function ok(name, detail) {
  checks.push({ name, status: 'ok', detail })
}
function warn(name, detail) {
  checks.push({ name, status: 'warn', detail })
}
function fail(name, detail) {
  checks.push({ name, status: 'fail', detail })
}

if (!url || !key || !anon) {
  fail('Environment', 'Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in .env.local')
} else {
  ok('Environment', 'Supabase URL and keys are present')
}

if (!process.env.PAYMONGO_SECRET_KEY) warn('PayMongo', 'Optional — cash checkout still works')
else ok('PayMongo', 'Secret key set')

const forceDb =
  process.env.OPENAI_FORCE_DATABASE === '1' || process.env.AI_FORCE_DATABASE === '1'
const groq = String(process.env.GROQ_API_KEY ?? '').trim()
const gemini = String(process.env.GEMINI_API_KEY ?? '').trim()
const orKey = String(process.env.OPENROUTER_API_KEY ?? '').trim()
const openAiKey = String(process.env.OPENAI_API_KEY ?? '').trim().replace(/^["']|["']$/g, '')
if (forceDb) ok('AI', 'Database-only mode — run scripts/test-ai.mjs')
else if (groq || gemini || orKey || openAiKey) {
  ok('AI', `Provider env set — run node --env-file=.env.local scripts/test-ai.mjs`)
} else {
  warn('AI', 'Optional — Groq free tier: docs/FREE-AI-PROVIDERS.md or OPENAI_FORCE_DATABASE=1')
}

if (process.env.SUPABASE_PHONE_AUTH_ENABLED === '1') ok('Phone OTP', 'Enabled in app')
else warn('Phone OTP', 'Use email registration, or set SUPABASE_PHONE_AUTH_ENABLED=1')

if (process.env.PHILSMS_API_TOKEN?.trim() && process.env.PHILSMS_SENDER_ID?.trim()) {
  ok('PhilSMS', 'API token and sender ID set — run scripts/test-philsms.mjs')
} else if (process.env.SUPABASE_PHONE_AUTH_ENABLED === '1') {
  warn('PhilSMS', 'Add PHILSMS_API_TOKEN and PHILSMS_SENDER_ID — see docs/PHILSMS-CONNECT.md')
}

if (process.env.SUPABASE_SEND_SMS_HOOK_SECRET?.trim()) ok('Send SMS hook', 'Secret set in .env.local')
else if (process.env.SUPABASE_PHONE_AUTH_ENABLED === '1' && process.env.SUPABASE_PHONE_DEV_BYPASS !== '1') {
  warn('Send SMS hook', 'Set SUPABASE_SEND_SMS_HOOK_SECRET after enabling hook in Supabase')
}

let client
if (url && key) {
  client = createClient(url, key, { auth: { persistSession: false } })
  const probe = await client.from('profiles').select('id').limit(1)
  if (probe.error) {
    const msg = probe.error.message
    if (/permission denied/i.test(msg)) {
      fail(
        'Database',
        `${msg} — Run supabase/migrations/003_service_role_grants.sql and confirm SUPABASE_SERVICE_ROLE_KEY is the service_role secret (not anon).`,
      )
    } else fail('Database', msg)
  }
  else if (!probe.data?.length) warn('Database', 'Connected but empty — run supabase/schema.sql then supabase/seed.sql')
  else ok('Database', `Connected (${probe.data.length}+ profile row(s) visible)`)

  const colProbe = await client.from('profiles').select('phone, phone_verified, roles').limit(1)
  if (colProbe.error && /phone|column/i.test(colProbe.error.message)) {
    fail('Migration 002', 'Run supabase/migrations/002_phone_profiles.sql in Supabase SQL editor')
  } else if (!colProbe.error) {
    ok('Migration 002', 'phone / phone_verified / roles columns readable')
  }
}

console.log('\nAgriConnect setup verification\n' + '—'.repeat(40))
for (const item of checks) {
  const icon = item.status === 'ok' ? '[OK]' : item.status === 'warn' ? '[!!]' : '[XX]'
  console.log(`${icon} ${item.name}: ${item.detail}`)
}
const failed = checks.filter((c) => c.status === 'fail').length
console.log('—'.repeat(40))
console.log(failed ? `\nFix ${failed} blocking item(s) above, then restart pnpm dev.\n` : '\nCore setup looks good. Restart pnpm dev and use tests/e2e-checklist.md.\n')
process.exit(failed ? 1 : 0)
