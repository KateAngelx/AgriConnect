#!/usr/bin/env node
/**
 * Diagnose Supabase phone OTP (does not print keys).
 * Usage: node --env-file=.env.local scripts/test-phone-otp.mjs +639534113831
 */
import { createClient } from '@supabase/supabase-js'

const phone = process.argv[2] || '+639171234567'
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !anon) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const client = createClient(url, anon, { auth: { persistSession: false } })
const { data, error } = await client.auth.signInWithOtp({
  phone,
  options: { shouldCreateUser: true },
})

if (error) {
  console.log('OTP send: FAILED')
  console.log('  status:', error.status ?? 'n/a')
  console.log('  code:', error.code ?? 'n/a')
  console.log('  message:', error.message)
  if (/captcha/i.test(error.message)) {
    console.log('\nHint: Supabase Auth → Bot and Abuse Protection → disable CAPTCHA for local dev, or add a captcha widget to the verify page.')
  }
  if (/provider|sms|twilio|messagebird/i.test(error.message)) {
    console.log('\nHint: Enable Phone provider and add test number or SMS provider in Supabase dashboard.')
  }
  process.exit(1)
}

console.log('OTP send: OK')
console.log('  messageId:', data?.messageId ?? '(none)')
console.log('\nIf using test OTP, verify with the fixed code from Supabase Phone settings.')
