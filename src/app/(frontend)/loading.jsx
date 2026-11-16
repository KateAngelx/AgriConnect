export default function Loading() {
  return (
    <div className="page-container py-8" aria-busy="true">
      <div className="animate-pulse space-y-4" role="status" aria-label="Loading page">
        <div className="h-4 w-28 rounded bg-[#d5e4d4]" />
        <div className="h-8 w-2/3 max-w-md rounded-lg bg-[#d5e4d4]" />
        <div className="h-24 rounded-xl bg-[#e7f3e4]" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-28 rounded-xl bg-[#e7f3e4]" />
          <div className="h-28 rounded-xl bg-[#e7f3e4]" />
        </div>
      </div>
    </div>
  )
}
