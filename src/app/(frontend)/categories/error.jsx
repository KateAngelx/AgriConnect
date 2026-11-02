'use client'

export default function CategoriesError({ error, reset }) {
  return (
    <main>
      <div className="page-container page-section page-open">
        <h1 className="text-2xl font-bold text-[#142016]">Could not load categories</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-[#65766d]">
          {error?.message || 'Something went wrong while loading marketplace categories.'}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="btn btn-primary mt-6"
        >
          Try again
        </button>
      </div>
    </main>
  )
}
