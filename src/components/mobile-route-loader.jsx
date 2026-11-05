export function MobileRouteLoader() {
  return (
    <div
      className="fixed inset-0 z-[200] grid place-items-center bg-[#f3f8ef]/95"
      role="status"
      aria-label="Loading page"
    >
      <div className="size-12 animate-spin rounded-full border-[4px] border-[#d5e4d4] border-t-[#2e7d32]" aria-hidden="true" />
      <span className="sr-only">Loading page</span>
    </div>
  )
}
