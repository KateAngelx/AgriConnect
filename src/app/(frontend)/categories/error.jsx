'use client'

export default function CategoriesError({ error, reset }) {
  return (
    <main className="bg-[#f7f6ef] text-[#173c2c]">
      <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <h1 className="text-2xl font-bold text-[#142016]">Could not load categories</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-[#65766d]">
          {error?.message || 'Something went wrong while loading marketplace categories.'}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 rounded-full bg-[#5dbb38] px-5 py-2.5 text-sm font-bold text-white hover:opacity-90"
        >
          Try again
        </button>
      </div>
    </main>
  )
}
