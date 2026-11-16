'use client'

export function ProductSort({ sort, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor="product-sort" className="text-sm text-brand-muted">
        Sort
      </label>
      <select
        id="product-sort"
        value={sort}
        onChange={(event) => onChange(event.target.value)}
        className="ui-field h-10 w-auto bg-white"
      >
        <option value="-createdAt">Newest</option>
        <option value="price">Price: low to high</option>
        <option value="-price">Price: high to low</option>
      </select>
    </div>
  )
}
