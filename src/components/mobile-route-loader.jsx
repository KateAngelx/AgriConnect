export function MobileRouteLoader() {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-1 bg-[#d5e4d4]"
      role="status"
      aria-label="Loading page"
      aria-live="polite"
    >
      <div className="h-full w-1/3 animate-pulse bg-[#2e7d32]" aria-hidden="true" />
      <span className="sr-only">Loading page</span>
    </div>
  )
}
