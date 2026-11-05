export default function Loading() {
  return (
    <div role="status" className="ui-card flex min-h-32 items-center justify-center gap-3 p-6 text-sm text-[#5c6f62]">
      <span className="size-5 animate-spin rounded-full border-2 border-[#b8d2af] border-t-[#2e7d32]" />
      Loading seller dashboard…
    </div>
  )
}
