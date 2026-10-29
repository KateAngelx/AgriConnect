export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-5 py-16 text-center">
      <div className="grid size-16 place-items-center rounded-full bg-[#e8f5e3] text-3xl font-bold text-[#2e7d32]">
        404
      </div>
      <p className="page-eyebrow mt-6 text-[#4f8d3b]">Page not found</p>
      <h1 className="page-title mt-2 text-3xl sm:text-4xl">This harvest is no longer here.</h1>
      <p className="page-lead mt-4 max-w-lg text-[#65766d]">
        The page may have moved, or the link may no longer be available. Browse the marketplace to find fresh listings.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <a href="/products" className="rounded-full bg-[#5dbb38] px-6 py-3 text-sm font-bold text-white">
          Browse products
        </a>
        <a href="/" className="rounded-full border border-[#173c2c]/15 bg-white px-6 py-3 text-sm font-bold text-[#142016]">
          Back to homepage
        </a>
      </div>
    </main>
  )
}
