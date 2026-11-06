'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ProductCard } from '@/components/product-card'

const PAGE_SIZE = 12
const CACHE_TTL_MS = 30_000

export function ProductResults({
  initialProducts,
  totalDocs,
  totalPages,
  initialPage,
  search,
  baseParams,
}) {
  const [products, setProducts] = useState(initialProducts)
  const [page, setPage] = useState(initialPage)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const pageRef = useRef(initialPage)
  const cache = useRef(new Map([[initialPage, { products: initialProducts, savedAt: Date.now() }]]))
  const requests = useRef(new Map())

  const hrefFor = useCallback((target) => {
    const params = new URLSearchParams(baseParams)
    if (target > 1) params.set('page', String(target))
    else params.delete('page')
    const query = params.toString()
    return query ? `/products?${query}` : '/products'
  }, [baseParams])

  const loadPage = useCallback(async (target) => {
    const cached = cache.current.get(target)
    if (cached && Date.now() - cached.savedAt < CACHE_TTL_MS) return cached.products
    const existing = requests.current.get(target)
    if (existing) return existing

    const params = new URLSearchParams(baseParams)
    params.set('page', String(target))
    params.set('limit', String(PAGE_SIZE))
    const request = fetch(`/api/products?${params}`, { cache: 'default' }).then(async (response) => {
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Could not load this product page.')
      if (!Array.isArray(payload.docs)) throw new Error('The product page response was invalid.')
      cache.current.set(target, { products: payload.docs, savedAt: Date.now() })
      return payload.docs
    })
    requests.current.set(target, request)
    try {
      return await request
    } finally {
      requests.current.delete(target)
    }
  }, [baseParams])

  const navigate = useCallback((target, updateHistory = true) => {
    if (target < 1 || target > totalPages || target === pageRef.current) return
    pageRef.current = target
    setPage(target)
    setError('')
    if (updateHistory) window.history.pushState(null, '', hrefFor(target))
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: 'auto' }))
    window.setTimeout(() => window.scrollTo({ top: 0, left: 0, behavior: 'auto' }), 100)

    const cached = cache.current.get(target)
    if (cached && Date.now() - cached.savedAt < CACHE_TTL_MS) {
      setProducts(cached.products)
      setLoading(false)
      return
    }

    setLoading(true)
    loadPage(target)
      .then((nextProducts) => {
        if (pageRef.current === target) setProducts(nextProducts)
      })
      .catch((loadError) => {
        if (pageRef.current === target) {
          setError(loadError.message || 'Could not load products. Please try again.')
        }
      })
      .finally(() => {
        if (pageRef.current === target) setLoading(false)
      })
  }, [hrefFor, loadPage, totalPages])

  useEffect(() => {
    const handlePopState = () => {
      const requestedPage = Math.max(
        1,
        Math.min(totalPages, Number(new URLSearchParams(window.location.search).get('page')) || 1),
      )
      if (requestedPage !== pageRef.current) navigate(requestedPage, false)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [navigate, totalPages])

  function onPageClick(event, target) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) return
    event.preventDefault()
    navigate(target)
  }

  function prefetchPage(target) {
    if (target >= 1 && target <= totalPages && target !== pageRef.current) {
      loadPage(target).catch(() => {})
    }
  }

  return (
    <section id="product-results" aria-busy={loading}>
      <div className="mb-4 flex min-h-9 flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-brand-muted" aria-live="polite">
          {totalDocs === 1 ? '1 product' : `${totalDocs} products`}
          {search ? ` for “${search}”` : ''}
        </p>
        {loading ? <p className="text-sm font-medium text-brand-700">Loading page {page}…</p> : null}
      </div>

      {error ? (
        <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-brand-error px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {products.length ? (
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="page-empty">
          <h2 className="text-xl font-semibold text-brand-900">No products match these filters</h2>
          <p className="mt-2 text-brand-muted">Try another category, or clear the search to see every active listing.</p>
          <a href="/products" className="btn btn-secondary mt-5">Clear filters</a>
        </div>
      )}

      {totalPages > 1 ? (
        <nav className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label="Pagination">
          {page > 1 ? (
            <a
              href={hrefFor(page - 1)}
              className="btn btn-secondary"
              rel="prev"
              onPointerEnter={() => prefetchPage(page - 1)}
              onFocus={() => prefetchPage(page - 1)}
              onClick={(event) => onPageClick(event, page - 1)}
            >
              Previous
            </a>
          ) : (
            <span className="btn btn-secondary opacity-40">Previous</span>
          )}
          {Array.from({ length: totalPages }, (_, index) => {
            const number = index + 1
            const current = page === number
            return current ? (
              <span
                key={number}
                aria-label={`Page ${number}`}
                aria-current="page"
                className="grid size-11 place-items-center rounded-lg bg-brand-700 text-[13px] font-semibold text-white"
              >
                {number}
              </span>
            ) : (
              <a
                key={number}
                href={hrefFor(number)}
                aria-label={`Page ${number}`}
                onPointerEnter={() => prefetchPage(number)}
                onFocus={() => prefetchPage(number)}
                onClick={(event) => onPageClick(event, number)}
                className="grid size-11 touch-manipulation place-items-center rounded-lg bg-white text-[13px] font-semibold text-brand-900 ring-1 ring-brand-line"
              >
                {number}
              </a>
            )
          })}
          {page < totalPages ? (
            <a
              href={hrefFor(page + 1)}
              className="btn btn-secondary"
              rel="next"
              onPointerEnter={() => prefetchPage(page + 1)}
              onFocus={() => prefetchPage(page + 1)}
              onClick={(event) => onPageClick(event, page + 1)}
            >
              Next
            </a>
          ) : (
            <span className="btn btn-secondary opacity-40">Next</span>
          )}
        </nav>
      ) : null}
    </section>
  )
}
