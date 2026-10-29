import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import test from 'node:test'
import { verifyPaymongoWebhook } from '../src/server/paymongo-signature.js'

test('accepts a current PayMongo webhook signature', () => {
  const timestamp = 1_800_000_000
  const body = '{"data":{"type":"checkout_session.payment.paid"}}'
  const secret = 'whsec_test'
  const signature = crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')

  assert.equal(verifyPaymongoWebhook(body, `t=${timestamp},te=${signature}`, secret, timestamp), true)
})

test('rejects an expired or malformed PayMongo signature', () => {
  const timestamp = 1_800_000_000
  const body = '{"data":{"type":"checkout_session.payment.paid"}}'

  assert.equal(verifyPaymongoWebhook(body, `t=${timestamp},te=bad`, 'whsec_test', timestamp + 301), false)
  assert.equal(verifyPaymongoWebhook(body, 't=invalid,te=bad', 'whsec_test', timestamp), false)
})
