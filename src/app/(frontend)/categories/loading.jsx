export default function CategoriesLoading() {
  return (
    <main className="bg-[#f7f6ef] text-[#173c2c]">
      <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-16">
        <div className="h-4 w-40 animate-pulse rounded bg-[#173c2c]/10" />
        <div className="mt-4 h-10 w-72 max-w-full animate-pulse rounded bg-[#173c2c]/10" />
        <div className="mt-3 h-16 w-full max-w-2xl animate-pulse rounded bg-[#173c2c]/10" />
        <div className="mt-8 h-12 w-full max-w-xl animate-pulse rounded-2xl bg-[#173c2c]/10" />
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="min-h-[420px] animate-pulse rounded-2xl bg-white/80 shadow-sm">
              <div className="aspect-[16/10] bg-[#173c2c]/5" />
              <div className="space-y-3 p-5 pt-9">
                <div className="h-5 w-2/3 rounded bg-[#173c2c]/10" />
                <div className="h-4 w-full rounded bg-[#173c2c]/8" />
                <div className="h-4 w-4/5 rounded bg-[#173c2c]/8" />
                <div className="h-3 w-24 rounded bg-[#173c2c]/8" />
                <div className="h-4 w-36 rounded bg-[#173c2c]/10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
