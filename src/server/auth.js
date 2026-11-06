import { cache } from 'react'
import { cookies } from 'next/headers'
import { isEmailIdentifier, isPhoneIdentifier, normalizePhilippinePhone } from '@/lib/phone'
import { hashPassword, verifyPassword } from './passwords'
import { phoneSmsConfigured } from './phone-verify'
import { notify } from './notifications'
import { mirrorAuthUser, save, signInWithSupabase } from './sync'
import { getSupabaseAdmin, supabaseEnv } from '@/lib/supabase'
import { getStore, homeForRole, publicUser, readyStore } from './store'
import { userFromProfileRow } from './profile-user'

const SESSION_COOKIE = 'agriconnect-session'
const secureSessionCookie = () =>
  Boolean(process.env.VERCEL) || /^https:/i.test(process.env.NEXT_PUBLIC_SITE_URL || '')

async function cookieStore() {
  return cookies()
}

export { homeForRole }

export const currentUser = cache(async function currentUser() {
  const token = (await cookieStore()).get(SESSION_COOKIE)?.value
  if (!token) return null

  const client = supabaseEnv().serviceKey ? getSupabaseAdmin() : null
  if (client) {
    const { data: session, error: sessionError } = await client
      .from('sessions')
      .select('user_id')
      .eq('token', token)
      .maybeSingle()
    if (sessionError) {
      throw new Error(`Could not restore the authenticated session: ${sessionError.message}`)
    }
    if (!session?.user_id) return null

    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select(
        'id,name,email,phone,phone_verified,password_hash,role,roles,status,seller_id,service_area,delivery_addresses,created_at',
      )
      .eq('id', session.user_id)
      .maybeSingle()
    if (profileError) {
      throw new Error(`Could not load the authenticated account: ${profileError.message}`)
    }
    if (!profile) return null

    const user = userFromProfileRow(profile)
    const store = getStore()
    store.sessions.set(token, user.id)
    store.users.set(user.id, user)
    return publicUser(user)
  }

  const store = await readyStore()
  let userId = store.sessions.get(token)
  if (!userId) {
    return null
  }
  return publicUser(store.users.get(userId))
})

export async function startSession(user) {
  const store = await readyStore()
  const token = crypto.randomUUID()
  const client = getSupabaseAdmin()
  if (client) {
    const { error } = await client.from('sessions').upsert({ token, user_id: user.id })
    if (error) throw new Error(`Could not persist the authenticated session: ${error.message}`)
  }
  store.sessions.set(token, user.id)
  ;(await cookieStore()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: secureSessionCookie(),
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
  try {
    await save()
  } catch {
    // Authentication should still succeed if an optional database migration is pending.
  }
  return publicUser(user)
}

function findUserByEmail(store, email) {
  if (!email) return null
  const normalized = String(email).trim().toLowerCase()
  return (
    [...store.users.values()].find(
      (user) =>
        String(user.email || '')
          .trim()
          .toLowerCase() === normalized,
    ) || null
  )
}

function findUserByPhone(store, phone) {
  if (!phone) return null
  return [...store.users.values()].find((user) => user.phone === phone) || null
}

export async function registerAccount(input) {
  const name = String(input.name ?? '').trim()
  const authMethod = String(input.authMethod ?? 'email') === 'phone' ? 'phone' : 'email'
  const emailRaw = String(input.email ?? '')
    .trim()
    .toLowerCase()
  const phoneRaw = String(input.phone ?? input.contactNumber ?? '').trim()
  const password = String(input.password ?? '')
  const confirmation = String(input.confirmation ?? '')
  if (name.length < 2) return { error: 'Enter your full name.' }
  if (password.length < 8) return { error: 'Password must contain at least 8 characters.' }
  if (password !== confirmation) return { error: 'Passwords do not match.' }
  if (input.terms !== 'accepted')
    return { error: 'Accept the Terms and Privacy Policy to continue.' }

  let email = ''
  let phone = ''
  if (authMethod === 'phone') {
    phone = normalizePhilippinePhone(phoneRaw)
    if (!phone) return { error: 'Enter a valid Philippine mobile number (09XX or +63).' }
    if (!phoneSmsConfigured()) {
      return {
        error:
          'Phone registration requires SMS verification. Configure Supabase Phone auth and set SUPABASE_PHONE_AUTH_ENABLED=1, or register with email instead.',
      }
    }
    email = emailRaw && isEmailIdentifier(emailRaw) ? emailRaw : ''
  } else {
    email = emailRaw
    if (!isEmailIdentifier(email))
      return { error: 'Enter a valid email address or switch to phone registration.' }
    phone = phoneRaw ? normalizePhilippinePhone(phoneRaw) : ''
    if (phoneRaw && !phone)
      return { error: 'Optional phone number is not a valid Philippine mobile number.' }
  }

  if (!email && !phone) {
    return { error: 'Provide an email address or a verified phone number to register.' }
  }

  const store = await readyStore()
  if (email && findUserByEmail(store, email)) {
    return { error: 'An account with this email already exists. Sign in or use another email.' }
  }
  if (phone && findUserByPhone(store, phone)) {
    return { error: 'An account with this phone number already exists. Sign in instead.' }
  }

  const user = {
    id: crypto.randomUUID(),
    name,
    email: email || null,
    phone: phone || null,
    phoneVerified: authMethod === 'phone' ? false : true,
    passwordHash: hashPassword(password),
    role: 'buyer',
    roles: ['buyer'],
    status: 'approved',
    serviceArea: '',
    createdAt: new Date().toISOString(),
  }
  store.users.set(user.id, user)
  if (email) await mirrorAuthUser({ email, password, name, role: 'buyer' })
  await save()
  if (authMethod === 'phone') {
    return { ok: true, needsPhoneVerification: true, phone, user: publicUser(user) }
  }
  return { ok: true, user: publicUser(user) }
}

export async function markPhoneVerified(userId, phone) {
  const normalized = normalizePhilippinePhone(phone)
  if (!normalized) return { error: 'Invalid phone number.' }
  const store = await readyStore()
  const user = store.users.get(userId)
  if (!user || user.phone !== normalized) return { error: 'Account not found.' }
  user.phoneVerified = true
  await save()
  return { ok: true }
}

export async function loginAccount(input) {
  const identifier = String(input.identifier ?? input.email ?? '').trim()
  const password = String(input.password ?? '')
  if (!identifier) return { error: 'Enter your email or phone number.' }
  if (!password) return { error: 'Enter your password.' }
  const store = await readyStore()
  let user = null
  if (isEmailIdentifier(identifier)) {
    const email = identifier.toLowerCase()
    user = findUserByEmail(store, email)
    const supabaseMatch = await signInWithSupabase(email, password)
    if (!user && supabaseMatch) {
      const client = getSupabaseAdmin()
      const { data: profile } =
        (await client
          ?.from('profiles')
          .select(
            'id,name,email,phone,phone_verified,password_hash,role,roles,status,seller_id,service_area,delivery_addresses,created_at',
          )
          .eq('email', email)
          .maybeSingle()) || {}
      if (profile?.id) {
        user = userFromProfileRow(profile)
        store.users.set(user.id, user)
      }
    }
    const passwordMatch = user && verifyPassword(password, user.passwordHash || user.password)
    if (!user || (!passwordMatch && !supabaseMatch)) {
      return { error: 'The email or password is incorrect.' }
    }
  } else if (isPhoneIdentifier(identifier)) {
    const phone = normalizePhilippinePhone(identifier)
    user = findUserByPhone(store, phone)
    const passwordMatch = user && verifyPassword(password, user.passwordHash || user.password)
    if (!user || !passwordMatch) {
      return { error: 'The phone number or password is incorrect.' }
    }
    if (user.phone && !user.phoneVerified) {
      return {
        error: 'Verify your phone number before signing in.',
        needsPhoneVerification: true,
        phone: user.phone,
      }
    }
  } else {
    return { error: 'Enter a valid email address or Philippine mobile number.' }
  }
  if (user.status === 'rejected' || user.status === 'suspended') {
    return { error: `This account is ${user.status}. Contact an administrator.` }
  }
  await startSession(user)
  return { user: publicUser(user) }
}

export async function logoutAccount() {
  const store = await readyStore()
  const token = (await cookieStore()).get(SESSION_COOKIE)?.value
  if (token) store.sessions.delete(token)
  ;(await cookieStore()).set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: secureSessionCookie(),
    path: '/',
    expires: new Date(0),
  })
  const client = getSupabaseAdmin()
  if (client && token) {
    await client.from('sessions').delete().eq('token', token)
  }
  await save()
  return { ok: true }
}
