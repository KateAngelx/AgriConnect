#!/usr/bin/env node
/** Set demo pickup pins for seeded sellers (idempotent). */
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing Supabase env. Run with: node --env-file=.env.local scripts/seed-seller-pins.mjs')
  process.exit(1)
}

const client = createClient(url, key, { auth: { persistSession: false } })

const pins = [
  {
    id: 'laguna-greens',
    pickup_lat: 14.1723,
    pickup_lng: 121.2417,
    landmark: 'Near municipal hall',
    location: 'Laguna',
  },
  {
    id: 'benguet-growers',
    pickup_lat: 16.4023,
    pickup_lng: 120.596,
    landmark: 'Highland market road',
    location: 'Benguet',
  },
  {
    id: 'nueva-ecija-rice',
    pickup_lat: 15.5784,
    pickup_lng: 121.034,
    landmark: 'Rice mill gate',
    location: 'Nueva Ecija',
  },
]

let updated = 0
for (const pin of pins) {
  const { error } = await client
    .from('sellers')
    .update({
      pickup_lat: pin.pickup_lat,
      pickup_lng: pin.pickup_lng,
      landmark: pin.landmark,
      location: pin.location,
    })
    .eq('id', pin.id)
  if (error) {
    if (/pickup_lat|column/i.test(error.message)) {
      console.error('Run supabase/migrations/004_geo_pins.sql first.')
      process.exit(1)
    }
    throw error
  }
  updated += 1
}
console.log(`Seller pickup pins updated: ${updated} sellers (includes Laguna Greens for seller@agriconnect.ph).`)
