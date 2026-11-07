export default function Loading() {
  return (
    <main className="page-container page-section" aria-busy="true">
      <div className="animate-pulse space-y-5" role="status" aria-label="Loading page">
        <div className="h-4 w-28 rounded bg-[#d5e4d4]" />
        <div className="h-9 w-2/3 max-w-xl rounded-lg bg-[#d5e4d4]" />
        <div className="h-5 w-full max-w-2xl rounded bg-[#e7f3e4]" />
        <div className="grid gap-4 pt-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="ui-card overflow-hidden p-4">
              <div className="h-36 rounded-xl bg-[#e7f3e4]" />
              <div className="mt-4 h-4 w-2/3 rounded bg-[#d5e4d4]" />
              <div className="mt-3 h-4 w-full rounded bg-[#e7f3e4]" />
              <div className="mt-5 h-5 w-1/3 rounded bg-[#d5e4d4]" />
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
