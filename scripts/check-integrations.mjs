#!/usr/bin/env node
/** Reports integration readiness without printing secret values. */
import { createClient } from '@supabase/supabase-js'

const checks = []

function status(name, ok, detail) {
  checks.push({ name, ok, detail })
}

status('OPENAI_API_KEY', Boolean(process.env.OPENAI_API_KEY?.trim()), process.env.OPENAI_API_KEY?.trim() ? 'Set' : 'Add key to .env.local')
status(
  'PAYMONGO_SECRET_KEY',
  Boolean(process.env.PAYMONGO_SECRET_KEY?.trim()),
  process.env.PAYMONGO_SECRET_KEY?.trim() ? 'Set' : 'Add sk_test_... to .env.local',
)
status(
  'SUPABASE_PHONE_AUTH_ENABLED',
  process.env.SUPABASE_PHONE_AUTH_ENABLED === '1',
  process.env.SUPABASE_PHONE_AUTH_ENABLED === '1' ? 'Enabled in app' : 'Set to 1 in .env.local',
)

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (url && key) {
  const client = createClient(url, key, { auth: { persistSession: false } })
  const { data, error } = await client
    .from('sellers')
    .select('id, pickup_lat, pickup_lng')
    .eq('id', 'laguna-greens')
    .maybeSingle()
  if (error) status('Seller pin (DB)', false, error.message)
  else
    status(
      'Seller pin (laguna-greens)',
      Boolean(data?.pickup_lat && data?.pickup_lng),
      data?.pickup_lat ? 'Pickup pin stored' : 'Run scripts/seed-seller-pins.mjs',
    )
}

console.log('\nIntegration checklist\n' + '—'.repeat(36))
for (const row of checks) {
  console.log(`${row.ok ? '[OK]' : '[  ]'} ${row.name}: ${row.detail}`)
}
console.log('—'.repeat(36))
console.log('\nSupabase Phone SMS must be enabled in the dashboard (Auth → Phone → SMS provider).\n')
