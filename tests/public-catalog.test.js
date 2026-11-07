import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isPublicProduct,
  listProducts,
  listProductsPage,
  listSellers,
  summarizeRatings,
} from '../src/server/catalog.js'
import { submitFeedback } from '../src/server/feedback.js'
import { submitBuyerReport } from '../src/server/reports.js'
import { saveBuyerReview } from '../src/server/reviews.js'
import { setWishlistItem } from '../src/server/wishlist.js'
import { readyStore } from '../src/server/store.js'
import { GET as getProductImage } from '../src/app/api/products/[productId]/image/route.js'
import { loadPublicProductImage } from '../src/server/product-image.js'

function catalogClient(rowsByTable) {
  const queries = []
  return {
    queries,
    from(table) {
      return {
        select() {
          queries.push({ table, operation: 'select' })
          return this
        },
        eq() {
          return this
        },
        gt() {
          return this
        },
        or() {
          return this
        },
        order() {
          return this
        },
        range() {
          queries.push({ table, operation: 'range' })
          return Promise.resolve(rowsByTable[table])
        },
        in(column, values) {
          queries.push({ table, operation: 'in', column, values })
          return Promise.resolve(rowsByTable[table])
        },
      }
    },
  }
}

function productRows() {
  return {
    data: [
      {
        id: 'query-reuse-product',
        name: 'Query reuse produce',
        description: '',
        price: 10,
        unit: 'kg',
        stock: 5,
        location: 'Local',
        status: 'active',
        pickup: true,
        delivery: true,
        created_at: '2025-01-01T00:00:00.000Z',
        category_id: 'query-reuse-category',
        seller_id: 'query-reuse-seller',
      },
    ],
    count: 1,
    error: null,
  }
}

test('public products must be active and belong to an approved seller', () => {
  assert.equal(isPublicProduct({ status: 'active', seller: { status: 'approved' } }), true)
  assert.equal(isPublicProduct({ status: 'draft', seller: { status: 'approved' } }), false)
  assert.equal(isPublicProduct({ status: 'active', seller: { status: 'pending' } }), false)
  assert.equal(isPublicProduct({ status: 'active', seller: null }), false)
})

test('rating summaries average valid one-to-five star reviews', () => {
  assert.deepEqual(summarizeRatings([{ rating: 5 }, { rating: 4 }, { rating: 2 }]), {
    rating: 3.7,
    reviewCount: 3,
  })
  assert.deepEqual(summarizeRatings([{ rating: 0 }, { rating: 6 }, { rating: 'invalid' }]), {
    rating: null,
    reviewCount: 0,
  })
})

test('public catalog listings return five records per page', async () => {
  const store = await readyStore()
  const previousSellers = store.sellers
  const previousProducts = store.products
  const seller = { id: 'public-list-seller', farmName: 'Public List Farm', status: 'approved' }
  store.sellers = [
    seller,
    ...Array.from({ length: 6 }, (_, index) => ({
      id: `public-list-seller-${index}`,
      farmName: `Public List Farm ${index}`,
      status: 'approved',
    })),
  ]
  store.products = Array.from({ length: 7 }, (_, index) => ({
    id: `public-list-product-${index}`,
    name: `Public produce ${index}`,
    status: 'active',
    stock: 10,
    price: 10,
    createdAt: new Date(index).toISOString(),
    seller,
  }))

  try {
    const products = await listProducts({ limit: 5, page: 2 })
    const pagedProducts = await listProductsPage({ limit: 5, page: 2 })
    const sellers = await listSellers({ limit: 5, page: 2 })
    assert.equal(products.docs.length, 2)
    assert.equal(products.totalPages, 2)
    assert.equal(pagedProducts.docs.length, 2)
    assert.equal(pagedProducts.totalPages, 2)
    assert.equal(sellers.docs.length, 2)
    assert.equal(sellers.totalPages, 2)
  } finally {
    store.sellers = previousSellers
    store.products = previousProducts
  }
})

test('product pages reuse preloaded categories and sellers instead of querying them again', async () => {
  const client = catalogClient({
    products: productRows(),
    product_reviews: { data: [], error: null },
  })
  const category = {
    id: 'query-reuse-category',
    name: 'Produce',
    description: '',
    image: {},
  }
  const seller = {
    id: 'query-reuse-seller',
    farmName: 'Query Reuse Farm',
    location: 'Local',
    status: 'approved',
  }

  const result = await listProductsPage({ search: 'query-reuse-page' }, null, {
    client,
    categories: { docs: [category] },
    sellers: { docs: [seller] },
  })

  assert.deepEqual(
    client.queries.filter(({ table }) => table === 'categories' || table === 'sellers'),
    [],
  )
  assert.equal(result.docs[0].category.name, category.name)
  assert.equal(result.docs[0].seller.farmName, seller.farmName)
})

test('product pages fetch only category and seller relations missing from preloaded data', async () => {
  const client = catalogClient({
    products: productRows(),
    categories: { data: [], error: null },
    sellers: {
      data: [
        {
          id: 'query-reuse-seller',
          farm_name: 'Query Reuse Farm',
          status: 'approved',
        },
      ],
      error: null,
    },
    product_reviews: { data: [], error: null },
  })

  const result = await listProductsPage({ search: 'query-reuse-missing-relations' }, null, {
    client,
    categories: [],
    sellers: [],
  })

  assert.deepEqual(
    client.queries
      .filter(({ operation }) => operation === 'in')
      .map(({ table, values }) => ({
        table,
        values,
      })),
    [
      { table: 'sellers', values: ['query-reuse-seller'] },
      { table: 'categories', values: ['query-reuse-category'] },
      { table: 'product_reviews', values: ['query-reuse-product'] },
    ],
  )
  assert.equal(result.docs[0].seller.farmName, 'Query Reuse Farm')
})

test('public product image lookups reuse product and seller records across requests', async () => {
  const productIds = ['image-cache-product-one', 'image-cache-product-two']
  const sellerId = 'image-cache-seller'
  const queries = []
  const client = {
    from(table) {
      const filters = {}
      return {
        select() {
          return this
        },
        eq(column, value) {
          filters[column] = value
          return this
        },
        async maybeSingle() {
          queries.push(table)
          return {
            data:
              table === 'products'
                ? {
                    id: filters.id,
                    name: 'Image cache produce',
                    location: 'Local',
                    status: 'active',
                    seller_id: sellerId,
                    images: [{ url: 'data:image/png;base64,aW1hZ2U=' }],
                  }
                : { id: sellerId, farm_name: 'Image Cache Farm', status: 'approved' },
            error: null,
          }
        },
      }
    },
  }

  const [first, second] = await Promise.all(
    productIds.map((productId) => loadPublicProductImage(productId, client)),
  )

  assert.equal(first.product.images[0].url, 'data:image/png;base64,aW1hZ2U=')
  assert.equal(second.seller.status, 'approved')
  assert.deepEqual(queries.sort(), ['products', 'products', 'sellers'])
})

test('product image route returns the stored image bytes with a cacheable image response', async () => {
  const store = await readyStore()
  const previousProducts = store.products
  const bytes = Buffer.from('public-image-bytes')
  const product = {
    id: 'public-product-image-route',
    name: 'Visible image',
    status: 'active',
    images: [{ url: `data:image/png;base64,${bytes.toString('base64')}` }],
    seller: { id: 'public-image-seller', farmName: 'Visible Farm', status: 'approved' },
  }
  store.products = [...store.products, product]

  try {
    const response = await getProductImage(new Request('http://localhost'), {
      params: Promise.resolve({ productId: product.id }),
    })
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('Content-Type'), 'image/png')
    assert.match(response.headers.get('Cache-Control'), /max-age=300/)
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes)
  } finally {
    store.products = previousProducts
  }
})

test('public users cannot submit authenticated feedback, reports, reviews, or wishlist changes', async () => {
  assert.match(
    (
      await submitFeedback(null, {
        subject: 'Platform feedback',
        category: 'general-feedback',
        message: 'A public submission attempt.',
      })
    ).error,
    /approved buyers and sellers/,
  )
  assert.match(
    (
      await submitBuyerReport(null, {
        reportType: 'suspicious-activity',
        reason: 'Suspicious activity',
      })
    ).error,
    /approved buyers or sellers/,
  )
  assert.match(
    (
      await saveBuyerReview(null, {
        productId: 'private-test-product',
        rating: 5,
        body: '',
      })
    ).error,
    /approved buyer/,
  )
  const wishlist = await setWishlistItem(null, 'private-test-product', true)
  assert.ok(wishlist.error)
  assert.match(wishlist.redirectTo, /login/)
})
