import { SiteShell } from '@/components/site-shell'

export default function NotFound() {
  return (
    <SiteShell>
      <main className="page-container page-section flex min-h-[70vh] flex-col items-center justify-center text-center">
        <div className="max-w-2xl">
        <div className="grid size-16 place-items-center rounded-full bg-brand-50 text-xl font-bold text-brand-700">404</div>
        <p className="page-eyebrow mt-6 text-brand-700">Page not found</p>
        <h1 className="page-title mt-2 text-3xl text-brand-900 sm:text-4xl">This page is not available</h1>
        <p className="page-lead mt-3 max-w-lg text-brand-muted">
          The page may have moved, or the link may no longer be valid. Browse the marketplace to find current listings.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a href="/products" className="btn btn-primary">
            Browse products
          </a>
          <a href="/" className="btn btn-secondary">
            Back to homepage
          </a>
        </div>
        </div>
      </main>
    </SiteShell>
  )
}
