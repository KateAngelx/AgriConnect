import { getSupabaseAdmin, supabaseEnv } from '@/lib/supabase'
import {
  isRemovedBenguetProduct,
  isRemovedBenguetSeller,
  isRemovedNuevaEcijaProduct,
  isRemovedNuevaEcijaSeller,
} from '@/server/catalog-visibility'
import { loadPublicProductImage } from '@/server/product-image'
import { readyStore } from '@/server/store'

const PLACEHOLDER_IMAGE = `
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
  <rect width="640" height="480" fill="#eef8e8"/>
  <path d="M253 286l59-66 44 48 31-35 65 77H188l47-55z" fill="#b9dca8"/>
  <circle cx="397" cy="174" r="24" fill="#d5e4d4"/>
  <text x="320" y="350" fill="#5c6f62" font-family="system-ui,sans-serif" font-size="24" text-anchor="middle">No photo yet</text>
</svg>`.trim()

function missingImage() {
  return new Response(PLACEHOLDER_IMAGE, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

function imageResponse(images) {
  const first = images?.[0]
  const url = typeof first === 'string' ? first : first?.url
  if (!url) return missingImage()

  if (/^https?:\/\//i.test(url)) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: url,
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=900',
      },
    })
  }

  const match = /^data:(image\/(?:jpeg|png|webp|gif|avif));base64,([A-Za-z0-9+/=\r\n]+)$/i.exec(url)
  if (!match) return missingImage()

  return new Response(Buffer.from(match[2], 'base64'), {
    headers: {
      'Content-Type': match[1].toLowerCase(),
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=900',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

export async function GET(_request, { params }) {
  const { productId } = await params
  let product
  let seller

  if (supabaseEnv().enabled) {
    const client = getSupabaseAdmin()
    if (!client) throw new Error('Supabase is configured but its server client is unavailable.')
    const imageRecord = await loadPublicProductImage(productId, client)
    product = imageRecord?.product ?? null
    seller = imageRecord?.seller ?? null
  } else {
    const store = await readyStore()
    product = store.products.find((item) => item.id === productId) || null
    seller = product?.seller || null
  }

  const publicProduct =
    product?.status === 'active' &&
    seller?.status === 'approved' &&
    !isRemovedBenguetProduct(product) &&
    !isRemovedNuevaEcijaProduct(product) &&
    !isRemovedBenguetSeller(seller) &&
    !isRemovedNuevaEcijaSeller(seller)
  if (!publicProduct) {
    return new Response(null, {
      status: 404,
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  return imageResponse(product.images)
}
