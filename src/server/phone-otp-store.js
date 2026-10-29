import crypto from 'node:crypto'

/** In-memory OTP for PhilSMS direct mode (capstone / single-server dev). */
const pending = new Map()

const TTL_MS = 60 * 60 * 1000

function hashCode(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex')
}

export function savePhoneOtp(phone, code) {
  pending.set(phone, { hash: hashCode(code), exp: Date.now() + TTL_MS })
}

export function consumePhoneOtp(phone, code) {
  const row = pending.get(phone)
  if (!row || Date.now() > row.exp) {
    pending.delete(phone)
    return false
  }
  if (hashCode(code) !== row.hash) return false
  pending.delete(phone)
  return true
}

export function generateNumericOtp() {
  return String(crypto.randomInt(100000, 999999))
}
