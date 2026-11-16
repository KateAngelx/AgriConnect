'use client'

import { useCallback, useEffect, useState } from 'react'
import { ProductResults } from '@/components/product-results'
import { ProductSort } from '@/components/product-sort'

function normalizeSort(sort) {
  return sort === 'price' || sort === '-price' ? sort : '-createdAt'
}

function filtersFromSearch(search) {
  const categoryValue = String(search.get('category') || '').trim().toLowerCase()
  return {
    search: (search.get('q') || search.get('search') || '').trim(),
    category: categoryValue === 'all' ? '' : categoryValue,
    fulfillment: search.get('fulfillment') || '',
    available: search.get('available') === 'true',
    sort: normalizeSort(search.get('sort')),
    page: Math.max(1, Number(search.get('page')) || 1),
  }
}

function queryFor(filters, { includePage = true } = {}) {
  const params = new URLSearchParams()
  if (filters.search) params.set('q', filters.search)
  if (filters.category) params.set('category', filters.category)
  if (filters.fulfillment) params.set('fulfillment', filters.fulfillment)
  if (filters.available) params.set('available', 'true')
  if (filters.sort !== '-createdAt') params.set('sort', filters.sort)
  if (includePage && filters.page > 1) params.set('page', String(filters.page))
  return params
}

export function ProductBrowser({ categories, initial }) {
  const [view, setView] = useState(initial)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async (filters, { updateHistory = true } = {}) => {
    const next = { ...filters, sort: normalizeSort(filters.sort), page: Math.max(1, Number(filters.page) || 1) }
    setLoading(true)
    setError('')
    const params = queryFor(next)
    params.set('page', String(next.page))
    params.set('limit', '12')
    params.set('sort', next.sort)
    try {
      const response = await fetch(`/api/products?${params}`, { cache: 'default' })
      const payload = await response.json()
      if (!response.ok || !Array.isArray(payload.docs)) {
        throw new Error(payload.error || 'Could not load products.')
      }
      setView({
        ...next,
        products: payload.docs,
        totalDocs: payload.totalDocs,
        totalPages: payload.totalPages,
        page: payload.page || next.page,
      })
      if (updateHistory) {
        const query = queryFor(next).toString()
        window.history.pushState(null, '', query ? `/products?${query}` : '/products')
      }
    } catch (loadError) {
      setError(loadError.message || 'Could not load products.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const handlePopState = () => {
      load(filtersFromSearch(new URLSearchParams(window.location.search)), { updateHistory: false })
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [load])

  function applyForm(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const category = String(form.get('category') || '')
    load({
      search: String(form.get('q') || '').trim(),
      category: category === 'all' ? '' : category,
      fulfillment: String(form.get('fulfillment') || ''),
      available: form.get('available') === 'true',
      sort: view.sort,
      page: 1,
    })
  }

  const baseParams = queryFor({ ...view, page: 1 }, { includePage: false }).toString()

  return (
    <div className="grid gap-6 lg:grid-cols-[16rem_1fr] lg:gap-8">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <form className="ui-card space-y-5 p-5" onSubmit={applyForm}>
          <div>
            <label htmlFor="q" className="text-sm font-semibold">
              Search products
            </label>
            <input
              id="q"
              name="q"
              defaultValue={view.search}
              key={view.search}
              placeholder="Tomatoes, rice, herbs"
              className="ui-field mt-2"
            />
          </div>
          <div>
            <label htmlFor="category" className="text-sm font-semibold">
              Category
            </label>
            <select
              id="category"
              name="category"
              defaultValue={view.category || 'all'}
              key={`category-${view.category}`}
              className="ui-field mt-2"
            >
              <option value="all">All products</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="fulfillment" className="text-sm font-semibold">
              Fulfillment
            </label>
            <select
              id="fulfillment"
              name="fulfillment"
              defaultValue={view.fulfillment}
              key={`fulfillment-${view.fulfillment}`}
              className="ui-field mt-2"
            >
              <option value="">Pickup or delivery</option>
              <option value="pickup">Pickup</option>
              <option value="delivery">Delivery</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="available"
              value="true"
              defaultChecked={view.available}
              key={`available-${view.available}`}
            />{' '}
            In stock only
          </label>
          <button className="btn btn-dark btn-block" disabled={loading}>
            {loading ? 'Applying…' : 'Apply filters'}
          </button>
        </form>
      </aside>

      <div className="space-y-4">
        <ProductSort
          sort={view.sort}
          onChange={(sort) => load({ ...view, sort, page: 1 })}
        />
        {error ? (
          <p role="alert" className="rounded-xl border border-red-200 bg-brand-error px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        ) : null}
        <div className={loading ? 'opacity-70' : undefined} aria-busy={loading}>
          <ProductResults
            key={`${baseParams}:${view.page}:${view.products.map((product) => product.id).join(',')}`}
            initialProducts={view.products}
            totalDocs={view.totalDocs}
            totalPages={view.totalPages}
            initialPage={view.page}
            search={view.search}
            baseParams={baseParams}
            onPageChange={(page) => load({ ...view, page })}
          />
        </div>
      </div>
    </div>
  )
}
