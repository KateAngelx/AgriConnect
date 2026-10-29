import { redirect } from 'next/navigation'
import { currentUser, homeForRole } from './auth'
import {
  isApprovedAdmin,
  isApprovedBuyer,
  isApprovedDelivery,
  isApprovedSeller,
  hasRole,
} from './roles'

export async function requireUser(nextPath) {
  const user = await currentUser()
  if (!user) {
    const login = nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : '/login'
    redirect(login)
  }
  return user
}

export async function requireRole(roles, nextPath) {
  const user = await requireUser(nextPath)
  const allowed = Array.isArray(roles) ? roles : [roles]
  if (!allowed.some((role) => hasRole(user, role))) redirect('/account')
  return user
}

export async function requireApprovedBuyer(nextPath) {
  const user = await requireUser(nextPath)
  if (!isApprovedBuyer(user)) redirect('/products')
  return user
}

export async function requireAdmin() {
  const user = await requireUser()
  if (!isApprovedAdmin(user)) redirect('/account')
  return user
}

export async function requireSeller() {
  const user = await requireUser()
  if (!hasRole(user, 'seller')) redirect('/account')
  return user
}

export async function requireApprovedSeller() {
  const user = await requireSeller()
  if (!isApprovedSeller(user)) redirect('/seller/dashboard')
  return user
}

export async function requireDelivery() {
  const user = await requireUser()
  if (!hasRole(user, 'delivery')) redirect('/account')
  return user
}

export async function requireApprovedDelivery() {
  const user = await requireDelivery()
  if (!isApprovedDelivery(user)) redirect('/delivery/dashboard')
  return user
}

export function redirectIfAuthenticated(user) {
  if (user) redirect(homeForRole(user))
}
