'use client'

export function ProductSort({ search, category, fulfillment, available, sort }) {
  return (
    <form className="flex items-center gap-2">
      {search ? <input type="hidden" name="q" value={search} /> : null}
      {category ? <input type="hidden" name="category" value={category} /> : null}
      {fulfillment ? <input type="hidden" name="fulfillment" value={fulfillment} /> : null}
      {available ? <input type="hidden" name="available" value="true" /> : null}
      <label htmlFor="product-sort" className="text-sm text-brand-muted">
        Sort
      </label>
      <select
        id="product-sort"
        name="sort"
        defaultValue={sort}
        onChange={(event) => event.currentTarget.form.requestSubmit()}
        className="ui-field h-10 w-auto bg-white"
      >
        <option value="-createdAt">Newest</option>
        <option value="price">Price: low to high</option>
        <option value="-price">Price: high to low</option>
      </select>
    </form>
  )
}
