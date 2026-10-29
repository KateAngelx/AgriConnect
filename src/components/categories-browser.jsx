'use client'

import { useMemo, useState } from 'react'
import { CategoryIcon } from '@/components/category-icons'

function SearchIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20l-3-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function CategoryCard({ category }) {
  const countLabel =
    category.productCount === 1 ? '1 product' : `${category.productCount} products`

  return (
    <a
      href={`/products?category=${encodeURIComponent(category.id)}`}
      className="group flex h-full min-h-[420px] flex-col overflow-hidden rounded-2xl border border-[#173c2c]/10 bg-white shadow-sm transition hover:border-[#5dbb38]/35 hover:shadow-md"
    >
      <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-[#e8ebe3]">
        {category.imageUrl ? (
          <img
            src={category.imageUrl}
            alt={category.imageAlt || category.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
            loading="lazy"
            decoding="async"
            width={640}
            height={400}
          />
        ) : (
          <div className="grid h-full place-items-center text-[#65766d]">
            <CategoryIcon categoryId={category.id} className="size-10 opacity-40" />
          </div>
        )}
        <span className="absolute bottom-0 left-5 flex size-12 translate-y-1/2 items-center justify-center rounded-full border border-[#173c2c]/8 bg-white shadow-sm">
          <CategoryIcon categoryId={category.id} className="size-6" />
        </span>
      </div>

      <div className="flex flex-1 flex-col px-5 pb-5 pt-9">
        <h2 className="text-lg font-bold leading-snug text-[#142016] sm:text-xl">{category.name}</h2>
        <p className="mt-2 line-clamp-2 min-h-[2.75rem] flex-1 text-sm leading-relaxed text-[#65766d]">
          {category.description || 'Browse available local products in this category.'}
        </p>
        <p className="mt-3 text-xs font-medium text-[#65766d]">{countLabel}</p>
        <span className="mt-auto pt-4 text-sm font-bold text-[#4f8d3b] group-hover:text-[#3d8d29]">
          Explore category →
        </span>
      </div>
    </a>
  )
}

function PromoCard() {
  return (
    <article className="relative flex h-full min-h-[420px] flex-col overflow-hidden rounded-2xl border border-[#173c2c]/10 shadow-sm">
      <div
        className="absolute inset-0 bg-[linear-gradient(135deg,rgba(237,248,232,.94)_0%,rgba(220,236,210,.88)_100%),url('https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=900&q=80')] bg-cover bg-center"
        aria-hidden="true"
      />
      <div className="relative flex flex-1 flex-col justify-end p-6 sm:p-7">
        <span className="mb-3 grid size-11 place-items-center rounded-full bg-white/90 shadow-sm">
          <CategoryIcon categoryId="default" className="size-6" />
        </span>
        <h2 className="text-xl font-bold text-[#142016]">Support local farmers</h2>
        <p className="page-lead mt-2 line-clamp-3 text-sm text-[#3d5244]">
          Every purchase helps farming communities grow. Learn how AgriConnect connects harvests to
          households.
        </p>
        <a
          href="/about"
          className="mt-5 inline-flex w-fit rounded-full bg-[#173c2c] px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
        >
          Learn more →
        </a>
      </div>
    </article>
  )
}

function LeafWatermark({ className }) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={`pointer-events-none absolute text-[#5dbb38]/[0.07] ${className}`}
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M60 10c-8 18-8 38 0 58 8-20 8-40 0-58Zm-28 22c6 14 16 26 28 34-14-6-26-16-34-28 8 2 16 2 24 0 6-2 10-4 12-6Zm56 0c-2 2-6 4-12 6-8 2-16 2-24 0 8 12 20 22 34 28-12-8-22-20-28-34Z"
      />
    </svg>
  )
}

export function CategoriesBrowser({ categories }) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return categories
    return categories.filter((item) => {
      const haystack = `${item.name} ${item.description || ''}`.toLowerCase()
      return haystack.includes(term)
    })
  }, [categories, query])

  return (
    <main className="relative overflow-hidden bg-[#f7f6ef] text-[#173c2c]">
      <LeafWatermark className="-right-8 top-24 size-48 sm:size-64" />
      <LeafWatermark className="-left-10 bottom-32 size-40 rotate-180 sm:size-56" />

      <div className="relative mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-16">
        <header className="max-w-3xl">
          <p className="page-eyebrow text-[#4f8d3b]">Explore the harvest</p>
          <h1 className="page-title mt-2 text-4xl text-[#142016] sm:text-5xl">Shop by category</h1>
          <p className="page-lead mt-4 max-w-2xl text-base text-[#65766d]">
            Discover fresh produce and agricultural products from local farmers. Browse by type to find
            what you need.
          </p>
        </header>

        {categories.length > 0 && (
          <div className="mt-8 max-w-xl">
            <label htmlFor="category-search" className="sr-only">
              Search categories
            </label>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#65766d]" />
              <input
                id="category-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search categories…"
                className="w-full rounded-2xl border border-[#173c2c]/12 bg-white py-3.5 pl-12 pr-4 text-sm text-[#142016] outline-none ring-[#5dbb38]/25 transition focus:border-[#5dbb38]/50 focus:ring-2"
                autoComplete="off"
              />
            </div>
          </div>
        )}

        {categories.length === 0 ? (
          <div
            className="mt-10 rounded-2xl border border-dashed border-[#173c2c]/20 bg-white px-6 py-16 text-center"
            role="status"
          >
            <CategoryIcon categoryId="default" className="mx-auto size-10 text-[#65766d]/50" />
            <p className="mt-4 text-[#65766d]">
              Categories will appear here once they are published in the marketplace.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="mt-10 rounded-2xl border border-dashed border-[#173c2c]/20 bg-white px-6 py-16 text-center"
            role="status"
          >
            <p className="text-[#65766d]">No categories match your search. Try another keyword.</p>
          </div>
        ) : (
          <ul className="mt-10 grid list-none gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((category) => (
              <li key={category.id} className="flex">
                <CategoryCard category={category} />
              </li>
            ))}
            {!query.trim() && (
              <li className="flex">
                <PromoCard />
              </li>
            )}
          </ul>
        )}
      </div>
    </main>
  )
}
