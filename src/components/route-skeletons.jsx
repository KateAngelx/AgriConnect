// Loading placeholders shaped like each section's real layout. Every skeleton is at least
// one screen tall so the footer stays out of view until the page arrives. None of them
// draw a header: the real header and sidebar stay on screen while a page loads.

function Bone({ className = '' }) {
  return <div className={`rounded-lg bg-[#e3eedf] ${className}`} />
}

function Shell({ children, className = '', name }) {
  return (
    <div
      className={`min-h-[calc(100dvh-4rem)] animate-pulse ${className}`}
      data-skeleton={name}
      role="status"
      aria-busy="true"
      aria-label="Loading page"
    >
      {children}
      <span className="sr-only">Loading page</span>
    </div>
  )
}

function Card({ className = '', children }) {
  return <div className={`ui-card ${className}`}>{children}</div>
}

function PageBand({ lead = true }) {
  return (
    <section className="page-band">
      <div className="page-container space-y-3">
        <Bone className="h-3 w-24" />
        <Bone className="h-9 w-2/3 max-w-md" />
        {lead ? <Bone className="h-4 w-full max-w-xl" /> : null}
      </div>
    </section>
  )
}

function ProductCardBone() {
  return (
    <Card className="overflow-hidden">
      <Bone className="aspect-[4/3] rounded-none" />
      <div className="space-y-2 p-4">
        <Bone className="h-4 w-3/4" />
        <Bone className="h-3 w-1/2" />
        <Bone className="mt-3 h-5 w-1/3" />
      </div>
    </Card>
  )
}

function ListRows({ rows = 5 }) {
  return (
    <div className="divide-y divide-[#d5e4d4]">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0 flex-1 space-y-2">
            <Bone className="h-4 w-40 max-w-full" />
            <Bone className="h-3 w-64 max-w-full" />
          </div>
          <Bone className="h-8 w-20 shrink-0" />
        </div>
      ))}
    </div>
  )
}

function WorkSectionBone({ rows = 5, className = '' }) {
  return (
    <Card className={`overflow-hidden ${className}`}>
      <div className="flex items-start justify-between gap-3 border-b border-[#d5e4d4] px-4 py-3">
        <div className="space-y-2">
          <Bone className="h-4 w-36" />
          <Bone className="h-3 w-56 max-w-full" />
        </div>
        <Bone className="h-4 w-8" />
      </div>
      <ListRows rows={rows} />
    </Card>
  )
}

export function HomeSkeleton() {
  return (
    <Shell name="home">
      <div className="bg-[#2b4a35]/25">
        <div className="page-container grid gap-6 py-10 lg:py-12">
          <Bone className="h-3 w-48 bg-white/50" />
          <Bone className="h-12 w-full max-w-lg bg-white/50" />
          <Bone className="h-5 w-full max-w-xl bg-white/40" />
          <Bone className="mt-4 h-14 w-full max-w-xl bg-white/70" />
        </div>
      </div>
      <section className="page-container page-section space-y-6">
        <Bone className="h-8 w-56" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Card key={index} className="space-y-3 p-4">
              <Bone className="size-10 rounded-full" />
              <Bone className="h-4 w-2/3" />
            </Card>
          ))}
        </div>
      </section>
      <section className="page-container page-section space-y-6">
        <Bone className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <ProductCardBone key={index} />
          ))}
        </div>
      </section>
    </Shell>
  )
}

export function ProductListSkeleton() {
  return (
    <Shell name="products">
      <PageBand />
      <div className="page-container page-section">
        <div className="grid gap-6 lg:grid-cols-[16rem_1fr] lg:gap-8">
          <Card className="h-fit space-y-5 p-5">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="space-y-2">
                <Bone className="h-3 w-24" />
                <Bone className="h-10 w-full" />
              </div>
            ))}
            <Bone className="h-10 w-full" />
          </Card>
          <div className="space-y-4">
            <Bone className="h-10 w-48" />
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, index) => (
                <ProductCardBone key={index} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  )
}

export function ProductDetailSkeleton() {
  return (
    <Shell name="product-detail" className="page-container page-section">
      <Bone className="mb-6 h-4 w-56" />
      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        <Bone className="aspect-square w-full rounded-xl" />
        <div className="space-y-4">
          <Bone className="h-3 w-24" />
          <Bone className="h-10 w-3/4" />
          <Bone className="h-8 w-40" />
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Bone className="h-20" />
            <Bone className="h-20" />
          </div>
          <Bone className="h-24 w-full" />
          <Card className="space-y-3 p-5">
            <Bone className="h-4 w-40" />
            <Bone className="h-11 w-full" />
            <div className="grid grid-cols-2 gap-3">
              <Bone className="h-11" />
              <Bone className="h-11" />
            </div>
          </Card>
        </div>
      </div>
    </Shell>
  )
}

export function CardGridSkeleton() {
  return (
    <Shell name="card-grid">
      <PageBand />
      <div className="page-container page-section">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <Card key={index} className="space-y-3 p-4">
              <Bone className="aspect-[4/3] w-full" />
              <Bone className="h-4 w-2/3" />
              <Bone className="h-3 w-1/2" />
            </Card>
          ))}
        </div>
      </div>
    </Shell>
  )
}

export function ContentPageSkeleton() {
  return (
    <Shell name="content">
      <PageBand />
      <div className="page-container page-section">
        <div className="max-w-3xl space-y-3">
          {Array.from({ length: 8 }, (_, index) => (
            <Bone key={index} className={`h-4 ${index % 3 === 2 ? 'w-2/3' : 'w-full'}`} />
          ))}
        </div>
      </div>
    </Shell>
  )
}

export function AuthSkeleton() {
  return (
    <Shell name="auth" className="grid min-h-dvh place-items-center bg-[#f3f8ef] px-4">
      <Card className="w-full max-w-md space-y-4 p-6">
        <Bone className="h-3 w-28" />
        <Bone className="h-8 w-40" />
        <Bone className="h-11 w-full" />
        <Bone className="h-11 w-full" />
        <Bone className="h-11 w-full" />
      </Card>
    </Shell>
  )
}

export function DashboardOverviewSkeleton() {
  return (
    <Shell name="dashboard-overview" className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index} className="space-y-3 p-4">
            <Bone className="h-3 w-20" />
            <Bone className="h-7 w-16" />
          </Card>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="grid gap-4 sm:grid-cols-2">
          <WorkSectionBone rows={5} />
          <WorkSectionBone rows={5} />
        </div>
        <WorkSectionBone rows={4} />
      </div>
    </Shell>
  )
}

export function DashboardListSkeleton() {
  return (
    <Shell name="dashboard-list" className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }, (_, index) => (
          <Bone key={index} className="h-8 w-24" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <WorkSectionBone rows={5} />
        <WorkSectionBone rows={5} />
      </div>
    </Shell>
  )
}

export function CartSkeleton() {
  return (
    <Shell name="cart">
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <Card className="flex items-center justify-between p-4">
            <Bone className="h-4 w-24" />
            <Bone className="h-4 w-16" />
          </Card>
          {Array.from({ length: 3 }, (_, index) => (
            <Card key={index} className="flex items-center gap-4 p-4">
              <Bone className="size-16 shrink-0" />
              <div className="min-w-0 flex-1 space-y-2">
                <Bone className="h-4 w-1/2" />
                <Bone className="h-3 w-1/3" />
              </div>
              <Bone className="h-9 w-24 shrink-0" />
            </Card>
          ))}
        </div>
        <Card className="h-fit space-y-4 p-5">
          <Bone className="h-5 w-32" />
          <Bone className="h-4 w-full" />
          <Bone className="h-4 w-full" />
          <Bone className="h-6 w-2/3" />
          <Bone className="h-11 w-full" />
        </Card>
      </div>
    </Shell>
  )
}
