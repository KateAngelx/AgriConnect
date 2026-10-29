import { cookies } from 'next/headers'
import { isEmailIdentifier, isPhoneIdentifier, normalizePhilippinePhone } from '@/lib/phone'
import { hashPassword, verifyPassword } from './passwords'
import { phoneSmsConfigured } from './phone-verify'
import { notify } from './notifications'
import { mirrorAuthUser, save, signInWithSupabase } from './sync'
import { homeForRole, publicUser, readyStore } from './store'

const SESSION_COOKIE = 'agriconnect-session'

async function cookieStore() {
  return cookies()
}

export { homeForRole }

export async function currentUser() {
  const store = await readyStore()
  const token = (await cookieStore()).get(SESSION_COOKIE)?.value
  if (!token) return null
  const userId = store.sessions.get(token)
  return publicUser(store.users.get(userId))
}

export async function startSession(user) {
  const store = await readyStore()
  const token = crypto.randomUUID()
  store.sessions.set(token, user.id)
  ;(await cookieStore()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
  await save()
  return publicUser(user)
}

function findUserByEmail(store, email) {
  if (!email) return null
  return [...store.users.values()].find((user) => user.email === email) || null
}

function findUserByPhone(store, phone) {
  if (!phone) return null
  return [...store.users.values()].find((user) => user.phone === phone) || null
}

export async function registerAccount(input) {
  const name = String(input.name ?? '').trim()
  const authMethod = String(input.authMethod ?? 'email') === 'phone' ? 'phone' : 'email'
  const emailRaw = String(input.email ?? '').trim().toLowerCase()
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
    if (!isEmailIdentifier(email)) return { error: 'Enter a valid email address or switch to phone registration.' }
    phone = phoneRaw ? normalizePhilippinePhone(phoneRaw) : ''
    if (phoneRaw && !phone) return { error: 'Optional phone number is not a valid Philippine mobile number.' }
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
  ;(await cookieStore()).delete(SESSION_COOKIE)
  await save()
  return { ok: true }
}
