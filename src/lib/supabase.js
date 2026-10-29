import { createClient } from '@supabase/supabase-js'

export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  return {
    url,
    anonKey,
    serviceKey,
    enabled: Boolean(url && (serviceKey || anonKey)),
  }
}

export function getSupabaseAnon() {
  if (typeof window !== 'undefined') {
    throw new Error('The Supabase anon client can only be used on the server.')
  }
  const { url, anonKey, enabled } = supabaseEnv()
  if (!enabled || !anonKey) return null
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function getSupabaseAdmin() {
  if (typeof window !== 'undefined') {
    throw new Error('The Supabase admin client can only be used on the server.')
  }
  const { url, serviceKey, anonKey, enabled } = supabaseEnv()
  if (!enabled) return null
  return createClient(url, serviceKey || anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
