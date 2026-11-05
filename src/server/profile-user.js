export function userFromProfileRow(profile) {
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email || null,
    phone: profile.phone || null,
    phoneVerified: Boolean(profile.phone_verified),
    passwordHash: profile.password_hash ?? '',
    role: profile.role,
    roles: profile.roles || [profile.role],
    status: profile.status,
    sellerId: profile.seller_id || undefined,
    serviceArea: profile.service_area || '',
    savedAddresses: Array.isArray(profile.delivery_addresses) ? profile.delivery_addresses : [],
    createdAt: profile.created_at || '',
  }
}
