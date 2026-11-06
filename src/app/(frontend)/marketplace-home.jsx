import Link from 'next/link'
import { MarketplaceAssistant } from '@/components/marketplace-assistant'
import { ProductCard } from '@/components/product-card'
import { SellerCard } from '@/components/seller-card'
import { FeedbackSubmitButton } from '@/components/feedback-submit-button'
import { submitFeedbackAction } from '@/app/(frontend)/feedback/actions'

function partnerHref(user, path) {
  if ((user?.roles?.includes('buyer') || user?.role === 'buyer') && user.status === 'approved') return path
  return `/login?next=${encodeURIComponent(path)}`
}

export default function MarketplaceHome({ user = null, products = [], sellers = [], categories = [] }) {
  return (
    <main className="bg-[#f3f8ef] text-[#142016]">
      <section className="home-hero">
        <img
          src="https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=2000&q=80"
          alt=""
          className="home-hero-photo"
        />
        <div
          className="absolute inset-0 bg-[linear-gradient(105deg,rgba(12,36,22,0.84)_0%,rgba(12,36,22,0.58)_40%,rgba(12,36,22,0.18)_100%)]"
          aria-hidden="true"
        />
        <div className="page-container relative grid w-full items-center gap-8 py-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(16rem,0.85fr)] lg:py-12">
          <div className="max-w-2xl">
            <p className="text-[13px] font-semibold text-[#c8f0b0]">Philippine harvest marketplace</p>
            <h1 className="page-title mt-2 max-w-xl text-[clamp(2rem,4vw,3rem)] text-white">
              Good food starts with good farms.
            </h1>
            <p className="mt-4 max-w-xl text-[17px] leading-7 text-white/85">
              Discover fresh, local produce and deal directly with Filipino farmers in one trusted marketplace.
            </p>
            <form action="/products" className="mt-8 flex max-w-xl flex-col gap-2 rounded-xl bg-white p-2 sm:flex-row sm:items-center">
              <label htmlFor="marketplace-search" className="sr-only">Search products</label>
              <div className="flex min-w-0 flex-1 items-center">
                <svg viewBox="0 0 24 24" className="ml-2 size-5 shrink-0 fill-none stroke-[#2e7d32] stroke-2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
                <input id="marketplace-search" name="q" placeholder="Search mango, rice, vegetables..." className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-base text-[#142016] outline-none placeholder:text-[#6b7f72]" />
              </div>
              <button className="btn btn-primary w-full sm:w-auto">Search</button>
            </form>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-white/85">
              <span className="flex items-center gap-2"><svg viewBox="0 0 24 24" className="size-4 fill-none stroke-[#c8f0b0] stroke-2" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>Verified local farms</span>
              <span className="flex items-center gap-2"><svg viewBox="0 0 24 24" className="size-4 fill-none stroke-[#c8f0b0] stroke-2" aria-hidden="true"><path d="M3 12h18M12 3v18"/></svg>Fresh pickup and delivery</span>
            </div>
          </div>
          <div className="hidden justify-self-end lg:block">
            <div className="relative grid size-52 place-items-center rounded-full border border-white/30 bg-white/12 text-center text-white shadow-[0_24px_80px_rgba(0,0,0,0.24)] backdrop-blur-sm">
              <div className="absolute -inset-3 rounded-full border border-dashed border-white/25" aria-hidden="true" />
              <div>
                <p className="text-[42px] font-bold leading-none">{products.length || 0}</p>
                <p className="mt-2 text-sm font-semibold uppercase tracking-[0.18em]">Fresh listings</p>
                <p className="mt-1 text-xs text-white/70">from local growers</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="page-container page-section">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="page-eyebrow">Browse the market</p>
            <h2 className="page-section-title mt-2 text-3xl text-brand-900">Shop by category</h2>
          </div>
          <Link href="/categories" className="inline-flex items-center gap-2 text-sm font-bold text-brand-700">View all categories <svg viewBox="0 0 24 24" className="size-4 fill-none stroke-current stroke-2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></Link>
        </div>
        <div className="mt-6 overflow-x-auto pb-1">
          <div className="flex min-w-max gap-3">
            {categories.map((category, index) => {
              const image = typeof category.image === 'object' && category.image?.url ? category.image.url : null
              return (
                <Link key={category.id} href={`/products?category=${encodeURIComponent(category.id)}`} className="ui-card flex w-36 items-center gap-2 overflow-hidden px-2 py-2 transition-colors hover:border-[#d2d2d7]">
                  <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-[#f5f5f7]">
                    {image ? <img src={image} alt="" className="size-full object-cover" /> : <div className="grid size-full place-items-center text-xs font-semibold text-[#6e6e73]">{String(index + 1).padStart(2, '0')}</div>}
                  </div>
                  <div className="min-w-0">
                    <span className="line-clamp-2 text-[12px] font-semibold leading-4 tracking-[-0.01em] text-[#1d1d1f]">{category.name}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
        {categories.length === 0 && (
          <div className="page-empty mt-6">Categories will appear as the marketplace grows.</div>
        )}
      </section>

      <section className="page-container page-section">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="page-eyebrow">In season now</p>
              <h2 className="page-section-title mt-2 text-3xl text-brand-900">Fresh from nearby farms</h2>
            </div>
            <Link href="/products" className="btn btn-secondary">Browse marketplace</Link>
          </div>
          {products.length ? (
            <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
              {products.slice(0, 6).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : <div className="page-empty mt-6">Fresh listings are being prepared.</div>}
      </section>

      {sellers.length ? (
        <section className="page-container page-section">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="page-eyebrow">Meet the growers</p>
              <h2 className="page-section-title mt-2 text-3xl text-brand-900">Farms in our marketplace</h2>
            </div>
            <Link href="/sellers" className="btn btn-secondary">Browse all sellers</Link>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {sellers.slice(0, 4).map((seller) => (
              <SellerCard key={seller.id} seller={seller} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="page-container page-section">
        <div className="grid gap-4 lg:grid-cols-[1fr_340px] lg:gap-6">
          <article className="ui-card grid overflow-hidden lg:grid-cols-[1.15fr_0.85fr]">
            <div className="flex flex-col justify-center p-5 sm:p-6">
              <p className="text-[13px] font-semibold text-[#248a3d]">Join our community</p>
              <h2 className="mt-2 text-3xl font-semibold leading-tight text-[#1d1d1f]">Build your livelihood with AgriConnect.</h2>
              <p className="mt-3 text-[15px] leading-6 text-[#6e6e73]">Grow your customer base and sell your harvest through one trusted marketplace.</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href={partnerHref(user, '/account/become-seller')} className="btn btn-primary w-fit">Apply as seller</Link>
                <Link href={partnerHref(user, '/account/become-delivery')} className="btn btn-secondary w-fit">Apply as delivery partner</Link>
              </div>
            </div>
            <img src="https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&w=1200&q=85" alt="Farmer with freshly harvested produce" className="h-56 w-full object-cover lg:h-full" />
          </article>
          <MarketplaceAssistant compact />
        </div>
      </section>

      <section className="page-container page-section">
        <div className="flex flex-col gap-4 rounded-xl bg-[#163224] p-5 text-white sm:p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Ready to shop local harvests?</h2>
            <p className="mt-1 max-w-xl text-[14px] leading-6 text-white/75">Browse what is in season, or see how buying, selling, and delivery work on AgriConnect.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/products" className="btn btn-primary">Shop products</Link>
            <Link href="/how-it-works" className="btn btn-ghost">How it works</Link>
          </div>
        </div>
      </section>

      <section id="platform-feedback" className="page-container page-section scroll-mt-24">
        <div className="ui-card grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-10">
          <div>
            <p className="page-eyebrow">Help us improve</p>
            <h2 className="page-section-title mt-2 text-2xl text-brand-900">
              Feedback about AgriConnect
            </h2>
            <p className="mt-3 text-sm leading-6 text-brand-muted">
              Share a suggestion, report a bug, or tell us how the marketplace is working for you.
              Sign in with an approved buyer or seller account to submit.
            </p>
            <p className="mt-3 text-xs leading-5 text-brand-muted">
              Platform feedback is private to you and authorized administrators. Only published
              product reviews appear publicly.
            </p>
          </div>
          <form action={submitFeedbackAction} className="grid gap-4">
            <input type="hidden" name="returnTo" value="/" />
            {user?.roles?.includes('seller') ? (
              <input type="hidden" name="submitterRole" value="seller" />
            ) : null}
            <label className="grid gap-1 text-sm font-medium text-brand-900">
              Subject
              <input
                name="subject"
                required
                minLength={3}
                maxLength={120}
                className="ui-field"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-brand-900">
              Category
              <select
                name="category"
                required
                className="ui-field"
              >
                <option value="">Choose a category</option>
                <option value="general-feedback">General Feedback</option>
                <option value="suggestion">Suggestions</option>
                <option value="bug-report">Bug Reports</option>
                <option value="user-experience">User Experience Feedback</option>
                <option value="other-concern">Other Concerns</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-brand-900">
              Message
              <textarea
                name="message"
                required
                minLength={10}
                maxLength={5000}
                rows={4}
                className="ui-field min-h-28"
              />
            </label>
            <FeedbackSubmitButton className="w-full sm:w-fit">Submit platform feedback</FeedbackSubmitButton>
          </form>
        </div>
      </section>
    </main>
  )
}
