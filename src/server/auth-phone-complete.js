import { markPhoneVerified } from './auth'
import { startSession } from './auth'
import { verifyPhoneVerificationOtp } from './phone-verify'
import { readyStore, publicUser } from './store'

export async function loginAfterPhoneVerification({ phone: phoneRaw, token }) {
  const verified = await verifyPhoneVerificationOtp(phoneRaw, token)
  if (verified.error) return { error: verified.error }
  const phone = verified.phone
  const store = await readyStore()
  const user = [...store.users.values()].find((entry) => entry.phone === phone)
  if (!user) return { error: 'No pending registration found for this number.' }
  const marked = await markPhoneVerified(user.id, phone)
  if (marked.error) return marked
  const { mirrorAuthUser } = await import('./sync')
  await mirrorAuthUser({ phone, name: user.name, role: user.role })
  const sessionUser = await startSession(user)
  return { user: sessionUser || publicUser(user) }
}
