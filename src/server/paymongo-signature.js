import crypto from 'node:crypto'

export function verifyPaymongoWebhook(rawBody, signatureHeader, webhookSecret, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!webhookSecret || !signatureHeader) return false
  const parts = Object.fromEntries(
    signatureHeader.split(',').map((part) => {
      const separator = part.indexOf('=')
      return separator === -1 ? ['', ''] : [part.slice(0, separator).trim(), part.slice(separator + 1).trim()]
    }).filter(([key]) => key),
  )
  const timestamp = Number(parts.t)
  if (!Number.isFinite(timestamp) || Math.abs(nowSeconds - timestamp) > 300) return false
  const signedPayload = `${timestamp}.${rawBody}`
  const expected = crypto.createHmac('sha256', webhookSecret).update(signedPayload).digest('hex')
  const signatures = [parts.te, parts.li].filter(Boolean)
  return signatures.some((value) => {
    const signature = value.startsWith('v1=') ? value.slice(3) : value
    if (!/^[a-f0-9]{64}$/i.test(signature)) return false
    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))
  })
}
