import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(String(password), salt, 32).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password, stored) {
  if (!stored) return false
  const value = String(stored)
  if (!value.includes(':')) return value === String(password)
  const [salt, hash] = value.split(':')
  if (!salt || !hash) return false
  const next = scryptSync(String(password), salt, 32)
  const current = Buffer.from(hash, 'hex')
  if (next.length !== current.length) return false
  return timingSafeEqual(next, current)
}
