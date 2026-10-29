#!/usr/bin/env node
/**
 * Test PhilSMS credits (does not print API token).
 * Usage: node --env-file=.env.local scripts/test-philsms.mjs 09534113831
 */
function toPhDigits(raw) {
  const digits = String(raw ?? '').replace(/\D/g, '')
  if (digits.startsWith('63') && digits.length === 12) return digits
  if (digits.startsWith('0') && digits.length === 11) return `63${digits.slice(1)}`
  if (digits.length === 10 && digits.startsWith('9')) return `63${digits}`
  return ''
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const apiBase = (process.env.PHILSMS_API_BASE ?? 'https://dashboard.philsms.com/api/v3').replace(/\/+$/, '')

async function postPhilSms(body, token) {
  let lastError
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(`${apiBase}/sms/send`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(25_000),
      })
      const payload = await response.json().catch(() => ({}))
      return { response, payload }
    } catch (error) {
      lastError = error
      const code = error?.cause?.code || error?.code || error?.message
      console.warn(`Attempt ${attempt}/3 network error: ${code}`)
      if (attempt < 3) await sleep(1500 * attempt)
    }
  }
  throw lastError
}

const phone = process.argv[2] || ''
const recipient = toPhDigits(phone)
if (!recipient) {
  console.error('Usage: node --env-file=.env.local scripts/test-philsms.mjs 09XXXXXXXXX')
  process.exit(1)
}

const token = process.env.PHILSMS_API_TOKEN?.trim()
const senderId = process.env.PHILSMS_SENDER_ID?.trim()
if (!token) {
  console.error('Set PHILSMS_API_TOKEN in .env.local (PhilSMS → Developers → API token).')
  process.exit(1)
}

const smsBody = {
  recipient: recipient.startsWith('63') ? `+${recipient}` : recipient,
  type: 'plain',
  message: 'AgriConnect PhilSMS test. If you received this, OTP delivery is ready.',
}
if (senderId) smsBody.sender_id = senderId.slice(0, 11)
else console.log('No PHILSMS_SENDER_ID — sending without sender_id (PhilSMS default).')

let response
let payload
try {
  ;({ response, payload } = await postPhilSms(smsBody, token))
} catch (error) {
  const code = error?.cause?.code || error?.code || ''
  console.error('PhilSMS send: NETWORK FAILED')
  console.error(error?.message || error)
  console.error('\nHints:')
  console.error('- Retry in a few seconds (ECONNRESET is often temporary).')
  console.error('- Disable VPN, try another network or hotspot.')
  console.error('- Allow Node through Windows Firewall / antivirus.')
  console.error('- Test site: curl.exe -I https://dashboard.philsms.com')
  if (code === 'ECONNRESET') {
    console.error('- If curl works but Node fails, run this script again (retries added).')
  }
  process.exit(1)
}

if (!response.ok || payload?.status === 'error') {
  console.log('PhilSMS send: FAILED')
  console.log('HTTP', response.status)
  console.log(payload?.message || payload?.error || JSON.stringify(payload) || response.statusText)
  if (/unauthenticated/i.test(String(payload?.message))) {
    console.log('\nHint: Regenerate API token in PhilSMS → Developers.')
    console.log('In .env.local: PHILSMS_API_TOKEN=token_with_no_quotes_or_spaces')
  }
  process.exit(1)
}

console.log('PhilSMS send: OK')
console.log('Check the phone ending in', recipient.slice(-4))
