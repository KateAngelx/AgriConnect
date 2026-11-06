import { NextResponse } from 'next/server'
import { currentUser } from '@/server/auth'
import { hasRole, isApprovedSeller } from '@/server/roles'
import { getSupabaseAdmin, supabaseEnv } from '@/lib/supabase'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const SUPPORTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const BUCKET = 'product-images'

export async function POST(request) {
  const user = await currentUser()
  if (!user || !hasRole(user, 'seller')) {
    return NextResponse.json({ error: 'Please sign in with an approved seller account.' }, { status: 401 })
  }
  if (!isApprovedSeller(user)) {
    return NextResponse.json({ error: 'Your seller account must be approved before uploading photos.' }, { status: 403 })
  }

  let body
  try {
    body = await request.formData()
  } catch {
    return NextResponse.json({ error: 'The selected photo could not be read. Please try again.' }, { status: 400 })
  }

  const file = body.get('file')
  if (!(file instanceof File) || !file.size) {
    return NextResponse.json({ error: 'Choose a photo to upload.' }, { status: 400 })
  }
  if (!SUPPORTED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Use a JPG, PNG, or WebP image.' }, { status: 400 })
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'The photo is too large. Choose an image smaller than 5 MB.' }, { status: 400 })
  }

  const client = supabaseEnv().serviceKey ? getSupabaseAdmin() : null
  if (!client) {
    const bytes = Buffer.from(await file.arrayBuffer())
    const dataUrl = `data:${file.type};base64,${bytes.toString('base64')}`
    return NextResponse.json({ url: dataUrl })
  }

  const bucket = await client.storage.createBucket(BUCKET, { public: true })
  if (bucket.error && !/already exists|already been created/i.test(bucket.error.message || '')) {
    return NextResponse.json({ error: `Could not prepare product image storage: ${bucket.error.message}` }, { status: 500 })
  }

  const productId = String(body.get('productId') || crypto.randomUUID()).replace(/[^a-zA-Z0-9_-]/g, '')
  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${user.sellerId}/${productId}-${crypto.randomUUID()}.${extension}`
  const uploaded = await client.storage.from(BUCKET).upload(
    path,
    Buffer.from(await file.arrayBuffer()),
    { contentType: file.type, upsert: false, cacheControl: '3600' },
  )
  if (uploaded.error) {
    return NextResponse.json({ error: `Could not upload product image: ${uploaded.error.message}` }, { status: 500 })
  }

  const publicUrl = client.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
  return NextResponse.json({ url: publicUrl, path })
}
