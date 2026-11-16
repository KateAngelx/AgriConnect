// Placeholder for the page content only. The real header (with the page title) and the
// sidebar stay on screen while a page loads, so the skeleton draws no header of its own.
export default function Loading() {
  return (
    <div className="page-container py-8" aria-busy="true">
      <div className="animate-pulse space-y-4" role="status" aria-label="Loading page">
        <div className="h-24 rounded-xl bg-[#e7f3e4]" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-28 rounded-xl bg-[#e7f3e4]" />
          <div className="h-28 rounded-xl bg-[#e7f3e4]" />
        </div>
      </div>
    </div>
  )
}
