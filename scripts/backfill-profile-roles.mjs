#!/usr/bin/env node
/**
 * Idempotent profile role backfill. Uses Supabase service role — run in dev/staging only.
 * Usage: node scripts/backfill-profile-roles.mjs
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

const client = createClient(url, key, { auth: { persistSession: false } })

function rolesFromLegacy(row) {
  if (Array.isArray(row.roles) && row.roles.length) return [...new Set(row.roles)]
  const roles = ['buyer']
  if (row.role === 'seller' || row.role === 'admin') roles.push('seller')
  if (row.role === 'delivery') roles.push('delivery')
  if (row.role === 'admin') roles.push('admin')
  return [...new Set(roles)]
}

async function main() {
  const { data: profiles, error } = await client.from('profiles').select('id, role, roles, status, seller_id')
  if (error) throw error
  const { data: apps } = await client.from('role_applications').select('user_id, application_type, status')
  const approvedSeller = new Set(
    (apps || []).filter((a) => a.application_type === 'seller' && a.status === 'approved').map((a) => a.user_id),
  )
  const approvedDelivery = new Set(
    (apps || []).filter((a) => a.application_type === 'delivery' && a.status === 'approved').map((a) => a.user_id),
  )

  let updated = 0
  for (const row of profiles || []) {
    const next = new Set(rolesFromLegacy(row))
    if (!next.has('buyer')) next.add('buyer')
    if (approvedSeller.has(row.id) || row.seller_id) next.add('seller')
    if (approvedDelivery.has(row.id)) next.add('delivery')
    if (row.role === 'admin') next.add('admin')
    const merged = [...next]
    const same = JSON.stringify(row.roles || []) === JSON.stringify(merged)
    if (same) continue
    const { error: upErr } = await client.from('profiles').update({ roles: merged }).eq('id', row.id)
    if (upErr) throw upErr
    updated += 1
  }
  console.log(`Role backfill complete. Profiles updated: ${updated} of ${profiles?.length || 0}.`)
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
